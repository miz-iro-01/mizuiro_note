# **App Name**: -MIZUIRO- Rakuten Auto Afi

## Core Features:

- AI Trend Analysis & Content Generation Tool: Utilizes Gemini API to identify trending, clickable topics on Pinterest and Threads. Generates diverse content using multi-persona settings (customizable tone, image style, target audience), allowing for automated posting or manual review, modification, and immediate publishing.
- Dashboard & Analytics: Displays critical performance metrics including total clicks from custom shortened URLs, estimated revenue (based on clicks and user-defined average unit price), and a comprehensive history log detailing successful and failed post operations.
- Firestore Data Management: Securely stores user data (e.g., payment status, API keys, SNS tokens) and all dashboard-related analytics and history logs within a Firestore database.
- Stripe Subscription & Payment Management: Manages the entire user subscription lifecycle from a 7-day free trial through Stripe Checkout, handling automatic billing transitions, dashboard locking for unpaid accounts, and provides an upsell pathway for 'Lifetime' access.
- Secure User Authentication: Implements Firebase Authentication for seamless Google login and manages secure storage and retrieval of user-specific API keys and social media tokens.
- Social Media API Integration: Enables official and secure OAuth 2.0 based integrations with Pinterest API and Threads API for automated content posting and management.
- Admin Dashboard: A dedicated administrative interface ('/admin' path) providing system-wide user statistics (active rates, total system clicks), an announcement posting feature for user dashboards, and a broadcast tool for sending mass emails to all Firebase authenticated users.

## Style Guidelines:

- Background color: #F0F9FF. This extremely light blue creates a clean and expansive canvas, aligning with a minimalist aesthetic.
- Primary color: #38BDF8. This vibrant sky blue is used for interactive elements, highlighting key information, and branding, evoking clarity and professionalism.
- Accent color: #1E293B. A deep navy blue for strong contrasts, important text, and structural elements, adding depth and sophistication.
- Body and headline font: 'Inter', a grotesque-style sans-serif, offering a modern, neutral, and highly readable appearance suitable for both display and longer text blocks in a minimalist interface.
- Clean, simple, and vector-based icons that complement the modern minimalist style and integrate well with glassmorphism effects for a cohesive visual experience.
- Utilize ample whitespace and a clear, grid-based layout to emphasize content and create an uncluttered, minimalist user experience. Elements will feature a glassmorphism style with frosted, translucent effects.
- Subtle, smooth transition animations for component state changes and navigations, enhancing user feedback without being intrusive and maintaining a modern, premium feel.