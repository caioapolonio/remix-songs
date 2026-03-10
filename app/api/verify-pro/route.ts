import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ isPro: false }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    const isPro = profile?.subscription_status === 'active'
    return NextResponse.json({ isPro })
  } catch {
    return NextResponse.json({ isPro: false }, { status: 500 })
  }
}
