import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { and, eq, count as drizzleCount } from 'drizzle-orm'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { presets, profiles } from '@/lib/db/schema'

// O front espera o campo `bass` (não `bass_boost`). Mapeia a row do banco.
function toClient(p: typeof presets.$inferSelect) {
  return {
    id: p.id,
    user_id: p.userId,
    name: p.name,
    speed: p.speed,
    reverb: p.reverb,
    bass: p.bassBoost,
    volume: p.volume,
    created_at: p.createdAt,
  }
}

async function isPro(userId: string): Promise<boolean> {
  const [profile] = await db
    .select({ subscriptionStatus: profiles.subscriptionStatus })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1)
  return profile?.subscriptionStatus === 'active'
}

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await isPro(session.user.id))) {
      return NextResponse.json([])
    }

    const rows = await db
      .select()
      .from(presets)
      .where(eq(presets.userId, session.user.id))
      .orderBy(presets.createdAt)

    return NextResponse.json(rows.map(toClient))
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch presets' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await isPro(session.user.id))) {
      return NextResponse.json(
        { error: 'Pro subscription required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, speed, reverb, bass, volume } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (name.trim().length > 32) {
      return NextResponse.json({ error: 'Name must be 32 characters or less' }, { status: 400 })
    }

    const [{ value: existing }] = await db
      .select({ value: drizzleCount() })
      .from(presets)
      .where(eq(presets.userId, session.user.id))

    if (existing >= 10) {
      return NextResponse.json({ error: 'Maximum of 10 presets reached' }, { status: 400 })
    }

    const [preset] = await db
      .insert(presets)
      .values({
        id: randomUUID(),
        userId: session.user.id,
        name: name.trim(),
        speed: speed ?? 1,
        reverb: reverb ?? 0,
        bassBoost: bass ?? 0,
        volume: volume ?? 1,
      })
      .returning()

    return NextResponse.json(toClient(preset), { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create preset' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await db
      .delete(presets)
      .where(and(eq(presets.id, id), eq(presets.userId, session.user.id)))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete preset' },
      { status: 500 }
    )
  }
}
