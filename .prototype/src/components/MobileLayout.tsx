import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

interface Props {
  children: ReactNode
  showNav?: boolean
}

export function MobileLayout({ children, showNav = true }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`max-w-md mx-auto px-4 ${showNav ? 'pb-20' : ''}`}>
        {children}
      </div>
      {showNav && <BottomNav />}
    </div>
  )
}
