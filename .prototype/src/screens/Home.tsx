import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { BalanceCard } from '../components/BalanceCard'
import { BetCard } from '../components/BetCard'
import { PageTransition } from '../components/PageTransition'
import { AnimatedCard } from '../components/AnimatedCard'
import { Compass, Plus, ArrowUpRight, ArrowDownLeft, Handshake, Trophy, RotateCcw, Send } from 'lucide-react'
import { formatBRL } from '../helpers/financial'
import { relativeTime } from '../helpers/date'
import type { ActivityType } from '../types'

const activityIcons: Record<ActivityType, typeof ArrowUpRight> = {
  deposit: ArrowDownLeft,
  withdrawal: Send,
  bet_created: Plus,
  bet_accepted: Handshake,
  bet_funded: Handshake,
  bet_won: Trophy,
  bet_lost: ArrowUpRight,
  refund: RotateCcw,
}

export function Home() {
  const navigate = useNavigate()
  const currentUser = useStore((s) => s.currentUser)
  const logout = useStore((s) => s.logout)
  const bets = useStore((s) => s.bets)
  const activities = useStore((s) => s.activities)

  const activeBets = bets.filter(
    (b) =>
      (b.playerAId === currentUser.id || b.playerBId === currentUser.id) &&
      (b.status === 'InviteCreated' || b.status === 'Funded' || b.status === 'InviteAcceptedPendingTx')
  )

  const recentActivities = activities.slice(0, 4)

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <PageTransition>
      <div className="pt-6 pb-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Olá,</p>
              <h1 className="text-2xl font-bold text-gray-900">{currentUser.name} 👋</h1>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
            >
              Sair
            </button>
          </div>
        </motion.div>

        <BalanceCard />

        <div className="grid grid-cols-3 gap-3">
          <AnimatedCard delay={0.1}>
            <button
              onClick={() => navigate('/deposit')}
              className="w-full bg-white border border-gray-100 rounded-2xl p-3.5 text-center hover:border-gray-200 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center mb-2 mx-auto">
                <Plus size={18} className="text-green-600" />
              </div>
              <p className="text-xs font-semibold text-gray-900">Depositar</p>
              <p className="text-[10px] text-gray-400">Pix → BRL1</p>
            </button>
          </AnimatedCard>

          <AnimatedCard delay={0.15}>
            <button
              onClick={() => navigate('/withdraw')}
              className="w-full bg-white border border-gray-100 rounded-2xl p-3.5 text-center hover:border-gray-200 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-2 mx-auto">
                <Send size={18} className="text-amber-600" />
              </div>
              <p className="text-xs font-semibold text-gray-900">Sacar</p>
              <p className="text-[10px] text-gray-400">BRL1 → Pix</p>
            </button>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <button
              onClick={() => navigate('/templates')}
              className="w-full bg-white border border-gray-100 rounded-2xl p-3.5 text-center hover:border-gray-200 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center mb-2 mx-auto">
                <Compass size={18} className="text-primary-600" />
              </div>
              <p className="text-xs font-semibold text-gray-900">Explorar</p>
              <p className="text-[10px] text-gray-400">Templates</p>
            </button>
          </AnimatedCard>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Apostas ativas</h2>
            {activeBets.length > 0 && (
              <button onClick={() => navigate('/bets')} className="text-xs text-primary-600 font-medium">
                Ver todas
              </button>
            )}
          </div>
          {activeBets.length === 0 ? (
            <AnimatedCard delay={0.25}>
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <p className="text-sm text-gray-400">Nenhuma aposta ativa</p>
                <button
                  onClick={() => navigate('/templates')}
                  className="text-sm text-primary-600 font-medium mt-1"
                >
                  Explorar templates →
                </button>
              </div>
            </AnimatedCard>
          ) : (
            <div className="space-y-3">
              {activeBets.slice(0, 3).map((bet, i) => (
                <AnimatedCard key={bet.id} delay={0.2 + i * 0.05}>
                  <BetCard bet={bet} />
                </AnimatedCard>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Atividade recente</h2>
            <button onClick={() => navigate('/activity')} className="text-xs text-primary-600 font-medium">
              Ver tudo
            </button>
          </div>
          <AnimatedCard delay={0.3}>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {recentActivities.map((item) => {
                const Icon = activityIcons[item.type] ?? ArrowUpRight
                return (
                  <button
                    key={item.id}
                    onClick={() => item.betId && navigate(`/bets/${item.betId}`)}
                    className="w-full flex items-center gap-3 p-3.5 text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-400 truncate">{item.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {item.amount != null && (
                        <p
                          className={`text-sm font-semibold ${
                            item.amount >= 0 ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          {item.amount >= 0 ? '+' : ''}
                          {formatBRL(item.amount)}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400">{relativeTime(item.timestamp)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </AnimatedCard>
        </div>
      </div>
    </PageTransition>
  )
}
