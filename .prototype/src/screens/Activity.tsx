import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { formatBRL } from '../helpers/financial'
import { relativeTime } from '../helpers/date'
import { motion } from 'framer-motion'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Handshake,
  Trophy,
  RotateCcw,
  Send,
} from 'lucide-react'
import { PageTransition } from '../components/PageTransition'
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

const activityColors: Record<ActivityType, string> = {
  deposit: 'bg-green-50 text-green-600',
  withdrawal: 'bg-amber-50 text-amber-600',
  bet_created: 'bg-primary-50 text-primary-600',
  bet_accepted: 'bg-blue-50 text-blue-600',
  bet_funded: 'bg-blue-50 text-blue-600',
  bet_won: 'bg-green-50 text-green-600',
  bet_lost: 'bg-red-50 text-red-600',
  refund: 'bg-gray-100 text-gray-600',
}

export function Activity() {
  const navigate = useNavigate()
  const activities = useStore((s) => s.activities)

  return (
    <PageTransition>
      <div className="pt-6 pb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-5">Atividade</h1>

        {activities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">Nenhuma atividade ainda</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {activities.map((item, i) => {
              const Icon = activityIcons[item.type] ?? ArrowUpRight
              const color = activityColors[item.type] ?? 'bg-gray-100 text-gray-600'
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  onClick={() => item.betId && navigate(`/bets/${item.betId}`)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
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
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {relativeTime(item.timestamp)}
                    </p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
