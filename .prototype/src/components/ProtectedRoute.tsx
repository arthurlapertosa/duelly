import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { MobileLayout } from './MobileLayout'

interface Props {
  children: ReactNode
  showNav?: boolean
}

export function ProtectedRoute({ children, showNav = true }: Props) {
  const isLoggedIn = useStore((s) => s.isLoggedIn)

  if (!isLoggedIn) {
    return <Navigate to="/" replace />
  }

  return <MobileLayout showNav={showNav}>{children}</MobileLayout>
}
