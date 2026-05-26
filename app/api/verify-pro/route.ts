import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ isPro: false }, { status: 401 })
    }

    const [profile] = await db
      .select({ subscriptionStatus: profiles.subscriptionStatus })
      .from(profiles)
      .where(eq(profiles.id, session.user.id))
      .limit(1)

    const isPro = profile?.subscriptionStatus === 'active'
    return NextResponse.json({ isPro })
  } catch {
    return NextResponse.json({ isPro: false }, { status: 500 })
  }
}
