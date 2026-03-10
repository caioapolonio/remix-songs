'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: signUpData, error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/signup?error=' + encodeURIComponent(error.message))
  }

  // Supabase returns empty identities when email already registered
  if (signUpData.user?.identities?.length === 0) {
    redirect('/signup?error=' + encodeURIComponent('An account with this email already exists. Try logging in.'))
  }

  revalidatePath('/', 'layout')
  redirect('/signup?success=Check your email to confirm your account')
}
