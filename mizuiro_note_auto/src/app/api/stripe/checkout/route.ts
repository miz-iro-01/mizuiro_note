import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { uid, email } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // FirestoreからStripe設定を取得
    const stripeDoc = await adminDb.collection('system').doc('stripe').get();
    if (!stripeDoc.exists) {
      return NextResponse.json({ error: 'システム決済設定が未完了です' }, { status: 500 });
    }

    const { secretKey, standardPriceId } = stripeDoc.data()!;
    if (!secretKey || !standardPriceId) {
      return NextResponse.json({ error: 'Stripe API設定が不足しています' }, { status: 500 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' });

    // Embedded Checkout セッションの作成
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email || undefined,
      client_reference_id: uid,
      line_items: [
        {
          price: standardPriceId,
          quantity: 1,
        },
      ],
      // 7日間の無料トライアルを直接ここで設定可能
      subscription_data: {
        trial_period_days: 7,
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({ 
      clientSecret: session.client_secret,
      publishableKey: stripeDoc.data().publicKey || ''
    });

  } catch (err: any) {
    console.error('Stripe Checkout Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
