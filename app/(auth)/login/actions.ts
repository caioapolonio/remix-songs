'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { APIError } from 'better-auth/api'
import { auth } from '@/lib/auth'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    })
  } catch (error) {
    let message = 'Could not sign in. Please try again.'
    if (error instanceof APIError) {
      message = error.message
      // better-auth bloqueia login se o email não foi verificado
      if (error.status === 403) {
        message = 'Please verify your email before signing in. Check your inbox.'
      }
    }
    // Preserva o email digitado (não a senha) para não obrigar a redigitar.
    const params = new URLSearchParams({ error: message, email })
    const redirectTo = formData.get('redirectTo') as string | null
    if (redirectTo) params.set('redirectTo', redirectTo)
    redirect('/login?' + params.toString())
  }

  revalidatePath('/', 'layout')

  const redirectTo = formData.get('redirectTo') as string | null
  if (redirectTo && redirectTo.startsWith('/')) {
    redirect(redirectTo)
  }
  redirect('/app')
}
