import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST() {
  try {
    await auth.api.signOut({ headers: await headers() })
  } catch {
    // Sessão já inválida/ausente — segue normalmente.
  }

  revalidatePath('/', 'layout')
  return new NextResponse(null, { status: 200 })
}
