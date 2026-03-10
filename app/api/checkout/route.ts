import { NextResponse } from 'next/server'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST() {
  try {
    const supabase = await createUserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single()

    // Block already-active subscribers from creating a second subscription
    if (profile?.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      )
    }

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      // Use admin client — authenticated users cannot update stripe_customer_id
      const admin = createAdminClient()
      const { error: updateError } = await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to save stripe_customer_id:', updateError)
        return NextResponse.json(
          { error: 'Failed to set up billing. Please try again.' },
          { status: 500 }
        )
      }

      // Re-read to confirm save (guards against race condition with concurrent requests)
      const { data: updated } = await admin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single()

      if (updated?.stripe_customer_id !== customerId) {
        // Another request won the race — use their customer ID
        customerId = updated?.stripe_customer_id
        if (!customerId) {
          return NextResponse.json(
            { error: 'Failed to set up billing. Please try again.' },
            { status: 500 }
          )
        }
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=canceled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
