'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type SubscriptionStatus = 'free' | 'active' | 'canceled' | 'past_due'

interface SubscriptionContextValue {
  status: SubscriptionStatus
  isPro: boolean
  email: string | null
  isAuthenticated: boolean
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  status: 'free',
  isPro: false,
  email: null,
  isAuthenticated: false,
})

export function SubscriptionProvider({
  children,
  status,
  email,
  isAuthenticated,
}: {
  children: ReactNode
  status: SubscriptionStatus
  email: string | null
  isAuthenticated: boolean
}) {
  const isPro = status === 'active'

  return (
    <SubscriptionContext.Provider value={{ status, isPro, email, isAuthenticated }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  return useContext(SubscriptionContext)
}
