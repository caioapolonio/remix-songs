'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { APIError } from 'better-auth/api'
import { auth } from '@/lib/auth'

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  // better-auth exige `name` no signup; derivamos do email se não houver campo.
  const name = (formData.get('name') as string | null) ?? email.split('@')[0]

  try {
    await auth.api.signUpEmail({
      body: { email, password, name },
      headers: await headers(),
    })
  } catch (error) {
    let message = 'Could not create account. Please try again.'
    if (error instanceof APIError) {
      // Email já cadastrado retorna 422 (USER_ALREADY_EXISTS)
      if (error.status === 422 || /already exists/i.test(error.message)) {
        message = 'An account with this email already exists. Try logging in.'
      } else {
        message = error.message
      }
    }
    redirect('/signup?error=' + encodeURIComponent(message))
  }

  revalidatePath('/', 'layout')
  redirect('/signup?success=Check your email to confirm your account')
}
