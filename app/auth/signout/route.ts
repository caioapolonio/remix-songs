import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await auth.api.signOut({ headers: await headers() })
  } catch {
    // Sessão já inválida/ausente — segue para o redirect mesmo assim.
  }

  revalidatePath('/', 'layout')
  return NextResponse.redirect(new URL('/login', req.url), { status: 302 })
}
