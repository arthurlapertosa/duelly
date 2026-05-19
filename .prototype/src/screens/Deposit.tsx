import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { ProgressTimeline } from '../components/ProgressTimeline'
import { PageTransition } from '../components/PageTransition'
import { calculateDepositFees, formatBRL } from '../helpers/financial'
import type { DepositStatus } from '../types'

type Step = 'amount' | 'pix' | 'processing'

const presets = [25, 50, 100, 200]

export function Deposit() {
  const navigate = useNavigate()
  const addDeposit = useStore((s) => s.addDeposit)
  const currentUser = useStore((s) => s.currentUser)

  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState<number | null>(null)
  const [customValue, setCustomValue] = useState('')
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(null)
  const [copied, setCopied] = useState(false)

  const effectiveAmount = customValue ? Number(customValue) : amount
  const fees = effectiveAmount && effectiveAmount > 0 ? calculateDepositFees(effectiveAmount) : null

  const handleCopy = () => {
    navigator.clipboard.writeText('duelly@pix.mock')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePixDone = () => {
    if (!effectiveAmount) return
    setStep('processing')
    addDeposit(effectiveAmount, setDepositStatus)
  }

  const timelineSteps = [
    {
      label: 'Pagamento detectado',
      sublabel: 'Verificando Pix',
      completed: depositStatus === 'pix_confirmed' || depositStatus === 'brl1_received',
      active: depositStatus === 'awaiting_pix',
    },
    {
      label: 'Confirmando na blockchain',
      sublabel: 'Convertendo para BRL1',
      completed: depositStatus === 'brl1_received',
      active: depositStatus === 'pix_confirmed',
    },
    {
      label: 'BRL1 creditado',
      sublabel: 'Saldo atualizado',
      completed: depositStatus === 'brl1_received',
    },
  ]

  return (
    <PageTransition>
      <div className="pt-4 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 mb-4">
          <ArrowLeft size={18} />
          <span className="text-sm">Voltar</span>
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-6">Adicionar saldo</h1>

        <AnimatePresence mode="wait">
          {step === 'amount' && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <p className="text-sm text-gray-500">
                Deposite via Pix e receba BRL1 na sua wallet.
              </p>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Quanto deseja adicionar?
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {presets.map((val) => (
                    <button
                      key={val}
                      onClick={() => {
                        setAmount(val)
                        setCustomValue('')
                      }}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        amount === val && !customValue
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      R${val}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Outro valor"
                    value={customValue}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, '')
                      setCustomValue(v)
                      setAmount(null)
                    }}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {fees && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Valor do Pix</span>
                    <span>{formatBRL(fees.grossAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Taxa da plataforma ({fees.feeBps / 100}%)</span>
                    <span className="text-red-500">-{formatBRL(fees.feeAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Você recebe em BRL1</span>
                    <span className="text-primary-600">{formatBRL(fees.netAmount)}</span>
                  </div>
                </motion.div>
              )}

              <button
                onClick={() => setStep('pix')}
                disabled={!effectiveAmount || effectiveAmount <= 0}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Continuar
              </button>
            </motion.div>
          )}

          {step === 'pix' && effectiveAmount && (
            <motion.div
              key="pix"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
                <p className="text-sm text-gray-500 mb-4">
                  Envie {formatBRL(effectiveAmount)} via Pix para:
                </p>

                <motion.div
                  className="w-40 h-40 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                >
                  <span className="text-xs text-gray-400">QR Code Pix (mock)</span>
                </motion.div>

                <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl py-2.5 px-4 mb-2">
                  <span className="text-sm font-mono text-gray-700">duelly@pix.mock</span>
                  <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600">
                    {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>

                <p className="text-[10px] text-gray-400">
                  Chave Pix simulada — não envie valores reais
                </p>
              </div>

              <button
                onClick={handlePixDone}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Já fiz o pagamento
              </button>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <p className="text-sm font-medium text-gray-900 mb-4">
                  Processando depósito de {formatBRL(effectiveAmount ?? 0)}
                </p>
                <ProgressTimeline steps={timelineSteps} />
              </div>

              {depositStatus === 'brl1_received' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 20 }}
                  className="bg-green-50 rounded-2xl p-5 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  >
                    <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
                  </motion.div>
                  <p className="text-base font-semibold text-green-800 mb-1">
                    Depósito confirmado!
                  </p>
                  <p className="text-sm text-green-600">
                    Novo saldo: {formatBRL(currentUser.balanceBRL1)}
                  </p>
                  <button
                    onClick={() => navigate('/home')}
                    className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    Voltar ao início
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
