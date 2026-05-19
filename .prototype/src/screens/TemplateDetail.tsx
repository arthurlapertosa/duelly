import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Calendar, Check, Shield } from 'lucide-react'
import { useStore } from '../store/useStore'
import { StakeCalculator } from '../components/StakeCalculator'
import { PageTransition } from '../components/PageTransition'
import { formatDate } from '../helpers/date'
import { calculateBetFinancials, formatBRL } from '../helpers/financial'

const categoryLabels: Record<string, string> = {
  collectibles: 'Colecionáveis',
  sports: 'Esportes',
}

const steps = [
  { id: 1, label: 'Escolha o lado' },
  { id: 2, label: 'Defina o valor' },
  { id: 3, label: 'Revise e crie' },
]

export function TemplateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const getTemplateById = useStore((s) => s.getTemplateById)
  const template = getTemplateById(id ?? '')

  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null)
  const [stake, setStake] = useState<number | null>(null)

  if (!template) {
    return (
      <div className="pt-6 text-center">
        <p className="text-gray-400">Template não encontrado</p>
      </div>
    )
  }

  const handleCreate = () => {
    if (selectedOutcome === null || !stake) return
    navigate('/create-invite', {
      state: { templateId: template.id, outcomeIndex: selectedOutcome, stake },
    })
  }

  const selectedOutcomeLabel =
    selectedOutcome != null ? template.outcomes[selectedOutcome] : null
  const financials = stake ? calculateBetFinancials(stake, template.loserFeeBps) : null
  const currentStep = selectedOutcome == null ? 1 : stake == null ? 2 : 3

  const handleOutcomeSelect = (outcomeIndex: number) => {
    setSelectedOutcome(outcomeIndex)
    setStake(null)
  }

  const handleResetOutcome = () => {
    setSelectedOutcome(null)
    setStake(null)
  }

  return (
    <PageTransition>
      <div className="pt-4 pb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 mb-4">
          <ArrowLeft size={18} />
          <span className="text-sm">Voltar</span>
        </button>

        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
            {categoryLabels[template.category] ?? template.category}
          </span>
          <span className="text-[10px] text-gray-400">{template.source}</span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-4 leading-snug">
          {template.title}
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 space-y-3"
        >
          <div className="flex items-start gap-2">
            <Shield size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-600 leading-relaxed">
              {template.rulesSummary}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar size={12} />
            <span>Apostas até {formatDate(template.bettingCloseAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar size={12} />
            <span>Resolução até {formatDate(template.resolutionDeadline)}</span>
          </div>
        </motion.div>

        <motion.div layout className="grid grid-cols-3 gap-2 mb-5">
          {steps.map((step) => {
            const isActive = currentStep === step.id
            const isComplete = currentStep > step.id

            return (
              <motion.div
                key={step.id}
                layout
                className={`rounded-2xl border px-3 py-3 transition-colors ${
                  isComplete
                    ? 'border-green-100 bg-green-50'
                    : isActive
                      ? 'border-primary-200 bg-primary-50'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                      isComplete
                        ? 'bg-green-500 text-white'
                        : isActive
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isComplete ? <Check size={12} /> : `0${step.id}`}
                  </span>
                </div>
                <p className={`text-xs font-semibold leading-snug ${isActive || isComplete ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.label}
                </p>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.div layout className="space-y-4">
          <motion.section layout className="rounded-3xl border border-gray-100 bg-white p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-600 mb-1">
                  Etapa 1
                </p>
                <h2 className="text-base font-semibold text-gray-900">Qual resultado voce defende?</h2>
              </div>
              {selectedOutcome !== null && (
                <button
                  onClick={handleResetOutcome}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Trocar
                </button>
              )}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {selectedOutcome === null ? (
                <motion.div
                  key="outcome-picker"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                  className="grid grid-cols-2 gap-3"
                >
                  {template.outcomes.map((outcome, index) => (
                    <motion.button
                      key={outcome}
                      onClick={() => handleOutcomeSelect(index)}
                      className="p-4 rounded-2xl text-center text-sm font-semibold border-2 border-gray-100 bg-white text-gray-700 hover:border-gray-200 transition-colors"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    >
                      {outcome}
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="outcome-summary"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                  className="rounded-2xl bg-primary-50 border border-primary-100 p-4"
                >
                  <p className="text-xs font-medium text-primary-700 mb-1">Seu lado</p>
                  <p className="text-base font-semibold text-primary-900">{selectedOutcomeLabel}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          <AnimatePresence initial={false}>
            {selectedOutcome !== null && (
              <motion.section
                key="stake-step"
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
                className="rounded-3xl border border-gray-100 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-600 mb-1">
                      Etapa 2
                    </p>
                    <h2 className="text-base font-semibold text-gray-900">Quanto voce quer arriscar?</h2>
                  </div>
                  {stake !== null && (
                    <button
                      onClick={() => setStake(null)}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      Editar
                    </button>
                  )}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  {stake === null ? (
                    <motion.div
                      key="stake-picker"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      <StakeCalculator
                        loserFeeBps={template.loserFeeBps}
                        onSelect={setStake}
                        selectedStake={stake}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="stake-summary"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                      className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4"
                    >
                      <p className="text-xs font-medium text-emerald-700 mb-1">Stake definida</p>
                      <p className="text-base font-semibold text-emerald-900">{formatBRL(stake)}</p>
                      {financials && (
                        <p className="text-xs text-emerald-700 mt-2">
                          Reserva por jogador: {formatBRL(financials.depositPerUser)}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {selectedOutcome !== null && stake !== null && financials && (
              <motion.section
                key="confirm-step"
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
                className="rounded-3xl bg-slate-950 p-5 text-white"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55 mb-2">
                  Etapa 3
                </p>
                <h2 className="text-lg font-semibold mb-4">Revise e lance o convite</h2>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-1">Resultado</p>
                    <p className="text-sm font-semibold text-white">{selectedOutcomeLabel}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-1">Stake</p>
                    <p className="text-sm font-semibold text-white">{formatBRL(stake)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-1">Retorno</p>
                    <p className="text-sm font-semibold text-white">{formatBRL(financials.winnerPayout)}</p>
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  className="w-full bg-white text-slate-950 font-semibold py-3.5 rounded-2xl transition-colors hover:bg-slate-100"
                >
                  Criar aposta
                </button>

                <p className="text-xs text-white/60 mt-3 leading-relaxed">
                  Seu convite segue para assinatura e funding no proximo passo do prototipo.
                </p>
              </motion.section>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </PageTransition>
  )
}
