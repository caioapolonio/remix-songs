import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: presets, error } = await supabase
      .from('presets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const mapped = presets.map((p: Record<string, unknown>) => ({
      ...p,
      bass: p.bass_boost,
    }))
    return NextResponse.json(mapped)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch presets' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_status !== 'active') {
      return NextResponse.json(
        { error: 'Pro subscription required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, speed, reverb, bass } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (name.trim().length > 32) {
      return NextResponse.json({ error: 'Name must be 32 characters or less' }, { status: 400 })
    }

    const { count } = await supabase
      .from('presets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count !== null && count >= 10) {
      return NextResponse.json({ error: 'Maximum of 10 presets reached' }, { status: 400 })
    }

    const { data: preset, error } = await supabase
      .from('presets')
      .insert({
        user_id: user.id,
        name: name.trim(),
        speed: speed ?? 1,
        reverb: reverb ?? 0,
        bass_boost: bass ?? 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const mapped = { ...preset, bass: (preset as Record<string, unknown>).bass_boost }
    return NextResponse.json(mapped, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create preset' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('presets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete preset' },
      { status: 500 }
    )
  }
}
