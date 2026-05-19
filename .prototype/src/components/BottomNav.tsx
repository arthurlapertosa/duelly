import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Compass, Handshake, Clock } from 'lucide-react'

const tabs = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/templates', label: 'Explorar', icon: Compass },
  { path: '/bets', label: 'Apostas', icon: Handshake },
  { path: '/activity', label: 'Atividade', icon: Clock },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
      <div className="max-w-md mx-auto flex">
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.path ||
            (tab.path === '/templates' && location.pathname.startsWith('/templates')) ||
            (tab.path === '/bets' && location.pathname.startsWith('/bets'))
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              <tab.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
