import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
    }

    const stripeDoc = await adminDb.collection('system').doc('stripe').get();
    if (!stripeDoc.exists) {
      return NextResponse.json({ error: 'System config not found' }, { status: 500 });
    }

    const { secretKey, webhookSecret, standardPriceId, proPriceId } = stripeDoc.data()!;
    if (!secretKey || !webhookSecret) {
      return NextResponse.json({ error: 'Stripe API keys missing' }, { status: 500 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' });
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.client_reference_id;
      
      if (uid) {
        // Fetch the subscription to check the plan
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        let plan = 'standard';
        if (priceId === proPriceId) plan = 'pro';

        await adminDb.collection('users').doc(uid).set({
          stripeCustomerId: session.customer,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: subscription.status, // "trialing", "active", etc.
          plan: plan,
          updatedAt: new Date(),
        }, { merge: true });
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      
      // Find user by stripeCustomerId
      const snapshot = await adminDb.collection('users').where('stripeCustomerId', '==', subscription.customer).limit(1).get();
      if (!snapshot.empty) {
        const uid = snapshot.docs[0].id;
        const priceId = subscription.items.data[0].price.id;
        
        let plan = 'standard';
        if (priceId === proPriceId) plan = 'pro';

        await adminDb.collection('users').doc(uid).set({
          subscriptionStatus: subscription.status,
          plan: plan,
          updatedAt: new Date(),
        }, { merge: true });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
