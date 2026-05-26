import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { getStripe } from '@/lib/stripe'

export async function POST() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const [profile] = await db
      .select({
        stripeCustomerId: profiles.stripeCustomerId,
        subscriptionStatus: profiles.subscriptionStatus,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)

    // Block already-active subscribers from creating a second subscription
    if (profile?.subscriptionStatus === 'active') {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 },
      )
    }

    let customerId = profile?.stripeCustomerId ?? null

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: session.user.email,
        metadata: { user_id: userId },
      })
      customerId = customer.id

      // Persiste o customer id. `returning` confirma o valor gravado.
      const [updated] = await db
        .update(profiles)
        .set({ stripeCustomerId: customerId })
        .where(eq(profiles.id, userId))
        .returning({ stripeCustomerId: profiles.stripeCustomerId })

      if (updated?.stripeCustomerId !== customerId) {
        // Outra request gravou primeiro (race) — usa o customer id vencedor.
        customerId = updated?.stripeCustomerId ?? null
        if (!customerId) {
          return NextResponse.json(
            { error: 'Failed to set up billing. Please try again.' },
            { status: 500 },
          )
        }
      }
    }

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?checkout=canceled`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    )
  }
}
