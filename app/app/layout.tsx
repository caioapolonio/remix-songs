import { createClient } from '@/lib/supabase/server'
import {
  SubscriptionProvider,
  type SubscriptionStatus,
} from '@/components/subscription-provider'
import { AppSidebar } from '@/components/app-sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <SubscriptionProvider status="free" email={null} isAuthenticated={false}>
        <div className="flex h-dvh bg-background text-foreground overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </SubscriptionProvider>
    )
  }

  // Fetch subscription status from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, email')
    .eq('id', user.id)
    .single()

  const status: SubscriptionStatus = (profile?.subscription_status as SubscriptionStatus) ?? 'free'
  const email = profile?.email ?? user.email ?? null

  return (
    <SubscriptionProvider status={status} email={email} isAuthenticated={true}>
      <div className="flex h-dvh bg-background text-foreground overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </SubscriptionProvider>
  )
}
