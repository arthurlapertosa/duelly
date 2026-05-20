import { Wallet, Plus, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { formatBRL } from '../helpers/financial'

export function BalanceCard() {
  const navigate = useNavigate()
  const currentUser = useStore((s) => s.currentUser)

  return (
    <motion.div
      className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-5 text-white"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white/70 text-xs font-medium">
          <Wallet size={14} />
          <span>Saldo disponível</span>
        </div>
        <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full">
          BRL1 na Polygon
        </span>
      </div>

      <motion.p
        className="text-3xl font-bold tracking-tight mb-1"
        key={currentUser.balanceBRL1}
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        {formatBRL(currentUser.balanceBRL1)}
      </motion.p>
      <p className="text-xs text-white/60 mb-5">
        {currentUser.walletAddress}
      </p>

      <div className="flex gap-2">
        <motion.button
          onClick={() => navigate('/deposit')}
          className="flex-1 bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={15} />
          Depositar
        </motion.button>
        <motion.button
          onClick={() => navigate('/withdraw')}
          className="flex-1 bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          whileTap={{ scale: 0.97 }}
        >
          <ArrowUpRight size={15} />
          Sacar
        </motion.button>
      </div>
    </motion.div>
  )
}
