import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// Admin client using service_role key to bypass RLS.
// Required because webhook updates subscription fields that authenticated users cannot modify.
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

async function updateSubscriptionStatus(
  customerId: string,
  status: string,
  subscriptionId?: string,
) {
  const supabase = createAdminClient()

  const { error, count } = await supabase
    .from('profiles')
    .update({
      subscription_status: status,
      subscription_id: subscriptionId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    throw new Error(`Failed to update subscription status: ${error.message}`)
  }

  if (count === 0) {
    console.warn(`No profile found for stripe_customer_id: ${customerId}`)
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (
          session.mode === 'subscription' &&
          session.customer &&
          session.subscription
        ) {
          await updateSubscriptionStatus(
            session.customer as string,
            'active',
            session.subscription as string,
          )
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const status =
          subscription.status === 'active'
            ? 'active'
            : subscription.status === 'past_due'
              ? 'past_due'
              : subscription.status === 'canceled'
                ? 'canceled'
                : 'free'

        await updateSubscriptionStatus(
          subscription.customer as string,
          status,
          subscription.id,
        )
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await updateSubscriptionStatus(subscription.customer as string, 'free')
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.customer) {
          await updateSubscriptionStatus(invoice.customer as string, 'past_due')
        }

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId =
          invoice.parent?.subscription_details?.subscription
        if (invoice.customer && subscriptionId) {
          await updateSubscriptionStatus(
            invoice.customer as string,
            'active',
            subscriptionId as string,
          )
        }
        break
      }

      default:
        // Unhandled event type
        break
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
