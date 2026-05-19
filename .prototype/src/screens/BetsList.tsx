import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Handshake, Trophy } from 'lucide-react'
import { useStore } from '../store/useStore'
import { BetCard } from '../components/BetCard'
import { PageTransition } from '../components/PageTransition'

const tabs = [
  { key: 'active', label: 'Ativas' },
  { key: 'finished', label: 'Finalizadas' },
] as const

const standardEase = [0.25, 0.1, 0.25, 1] as const

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: standardEase },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.18 },
  },
}

export function BetsList() {
  const currentUser = useStore((s) => s.currentUser)
  const bets = useStore((s) => s.bets)
  const [tab, setTab] = useState<'active' | 'finished'>('active')

  const myBets = bets.filter(
    (b) => b.playerAId === currentUser.id || b.playerBId === currentUser.id
  )

  const activeBets = myBets.filter((b) =>
    ['InviteCreated', 'InviteAcceptedPendingTx', 'Funded'].includes(b.status)
  )
  const finishedBets = myBets.filter((b) =>
    ['Resolved', 'Voided', 'Expired'].includes(b.status)
  )

  const displayed = tab === 'active' ? activeBets : finishedBets

  return (
    <PageTransition>
      <div className="pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: standardEase }}
          className="mb-5"
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 mb-1">
                Book pessoal
              </p>
              <h1 className="text-2xl font-bold text-gray-900">Suas apostas</h1>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
              <Handshake size={20} />
            </div>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Acompanhe convites em aberto, partidas financiadas e resoluções sem perder o ritmo do duelo.
          </p>
        </motion.div>

        <div className="relative flex gap-1 bg-gray-100 rounded-2xl p-1 mb-5">
          {tabs.map((tabItem) => {
            const isActive = tab === tabItem.key

            return (
              <button
                key={tabItem.key}
                onClick={() => setTab(tabItem.key)}
                className="relative flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {isActive && (
                  <motion.span
                    layoutId="bets-tab-pill"
                    className="absolute inset-0 rounded-xl bg-white shadow-sm"
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                  {tabItem.label} ({tabItem.key === 'active' ? activeBets.length : finishedBets.length})
                </span>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {displayed.length === 0 ? (
            <motion.div
              key={`empty-${tab}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.24, ease: standardEase }}
              className="bg-white border border-dashed border-gray-200 rounded-3xl py-14 px-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-4">
                {tab === 'active' ? <Handshake size={20} /> : <Trophy size={20} />}
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                {tab === 'active' ? 'Nenhuma aposta ativa agora' : 'Nenhuma aposta finalizada ainda'}
              </p>
              <p className="text-sm text-gray-400">
                {tab === 'active'
                  ? 'Crie um convite ou aceite um desafio para começar a movimentar o book.'
                  : 'Quando uma disputa for resolvida, o historico aparece aqui.'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={tab}
              variants={listVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-3"
            >
              {displayed.map((bet) => (
                <motion.div key={bet.id} variants={itemVariants} layout>
                  <BetCard bet={bet} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
