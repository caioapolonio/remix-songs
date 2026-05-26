import { eq } from 'drizzle-orm'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
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
  const session = await getServerSession()

  if (!session) {
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

  const [profile] = await db
    .select({ subscriptionStatus: profiles.subscriptionStatus })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1)

  const status: SubscriptionStatus =
    (profile?.subscriptionStatus as SubscriptionStatus) ?? 'free'
  const email = session.user.email ?? null

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
