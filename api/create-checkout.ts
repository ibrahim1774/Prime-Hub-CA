import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { companyName, siteId, plan = 'monthly' } = req.body || {};
    const isYearly = plan === 'yearly';
    const unitAmount = isYearly ? 6900 : 1400; // $69/yr or $14/mo CAD
    const interval = isYearly ? 'year' : 'month';

    console.log(`[Stripe Checkout] Creating session for: ${companyName || 'Unknown'} (Site: ${siteId || 'N/A'})`);

    const safeCompanyName = (companyName && companyName.trim()) || "Your Business";

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'cad',
                        product_data: {
                            name: `Website Hosting: ${safeCompanyName}`,
                            description: `Professional hosting and maintenance for your custom generated website.`,
                        },
                        unit_amount: unitAmount,
                        recurring: {
                            interval: interval,
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            allow_promotion_codes: true,
            success_url: `${req.headers.origin}?payment=success&siteId=${siteId || 'unknown'}`,
            cancel_url: `${req.headers.origin}`,
            metadata: {
                companyName: safeCompanyName,
                siteId: siteId || 'unknown',
                plan: plan
            },
            subscription_data: {
                description: `Website Hosting for ${safeCompanyName} (${isYearly ? 'Yearly' : 'Monthly'})`,
                metadata: {
                    companyName: safeCompanyName,
                    siteId: siteId || 'unknown',
                    plan: plan
                }
            }
        });

        console.log(`[Stripe Checkout] Session created: ${session.id}`);
        return res.status(200).json({ url: session.url });
    } catch (error: any) {
        console.error('[Stripe] Checkout Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to create checkout session' });
    }

}
