import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Bet } from '../types'
import { useStore } from '../store/useStore'
import { StatusBadge } from './StatusBadge'
import { formatBRL } from '../helpers/financial'
import { relativeTime } from '../helpers/date'

interface Props {
  bet: Bet
}

export function BetCard({ bet }: Props) {
  const navigate = useNavigate()
  const getTemplateById = useStore((s) => s.getTemplateById)
  const getUserById = useStore((s) => s.getUserById)
  const template = getTemplateById(bet.templateId)
  const opponent = bet.playerBId ? getUserById(bet.playerBId) : null

  return (
    <motion.button
      layout
      onClick={() => navigate(`/bets/${bet.id}`)}
      className="w-full bg-white rounded-2xl p-4 text-left border border-gray-100 hover:border-gray-200 transition-colors"
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <div className="flex items-center justify-between mb-2">
        <StatusBadge status={bet.status} />
        <span className="text-[11px] text-gray-400">
          {relativeTime(bet.createdAt)}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mb-1.5 leading-snug">
        {template?.title ?? 'Aposta'}
      </h3>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {opponent ? `vs ${opponent.name}` : 'Aguardando oponente'}
        </span>
        <span className="font-semibold text-gray-900">
          {formatBRL(bet.stake)}
        </span>
      </div>
    </motion.button>
  )
}
