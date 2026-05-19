import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { ProgressTimeline } from '../components/ProgressTimeline'
import { PageTransition } from '../components/PageTransition'
import { calculateWithdrawFees, formatBRL } from '../helpers/financial'
import type { WithdrawStatus } from '../types'

type Step = 'amount' | 'confirm' | 'processing'

const presets = [25, 50, 100, 200]

export function Withdraw() {
  const navigate = useNavigate()
  const withdraw = useStore((s) => s.withdraw)
  const currentUser = useStore((s) => s.currentUser)

  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState<number | null>(null)
  const [customValue, setCustomValue] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [withdrawStatus, setWithdrawStatus] = useState<WithdrawStatus | null>(null)

  const effectiveAmount = customValue ? Number(customValue) : amount
  const fees = effectiveAmount && effectiveAmount > 0 ? calculateWithdrawFees(effectiveAmount) : null
  const insufficientBalance = effectiveAmount ? effectiveAmount > currentUser.balanceBRL1 : false

  const handleConfirm = () => {
    if (!effectiveAmount || insufficientBalance) return
    setStep('processing')
    withdraw(effectiveAmount, setWithdrawStatus)
  }

  const timelineSteps = [
    {
      label: 'Processando saque',
      sublabel: 'Queimando BRL1',
      completed: withdrawStatus === 'brl1_burned' || withdrawStatus === 'pix_sent',
      active: withdrawStatus === 'processing',
    },
    {
      label: 'BRL1 queimado',
      sublabel: 'Iniciando transferência Pix',
      completed: withdrawStatus === 'pix_sent',
      active: withdrawStatus === 'brl1_burned',
    },
    {
      label: 'Pix enviado',
      sublabel: 'Valor creditado na sua conta',
      completed: withdrawStatus === 'pix_sent',
    },
  ]

  return (
    <PageTransition>
      <div className="pt-4 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 mb-4">
          <ArrowLeft size={18} />
          <span className="text-sm">Voltar</span>
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-6">Sacar saldo</h1>

        <AnimatePresence mode="wait">
          {step === 'amount' && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Saldo disponível</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatBRL(currentUser.balanceBRL1)}
                </span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Quanto deseja sacar?
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

              {insufficientBalance && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">Saldo insuficiente para este valor.</p>
                </div>
              )}

              {fees && !insufficientBalance && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Valor do saque</span>
                    <span>{formatBRL(fees.grossAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Taxa da plataforma ({fees.feeBps / 100}%)</span>
                    <span className="text-red-500">-{formatBRL(fees.feeAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Você recebe via Pix</span>
                    <span className="text-green-600">{formatBRL(fees.netAmount)}</span>
                  </div>
                </motion.div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Chave Pix de destino
                </label>
                <input
                  type="text"
                  placeholder="CPF, e-mail, celular ou chave aleatória"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => setStep('confirm')}
                disabled={!effectiveAmount || effectiveAmount <= 0 || insufficientBalance || !pixKey}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Continuar
              </button>
            </motion.div>
          )}

          {step === 'confirm' && fees && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
                <p className="text-sm text-gray-500 mb-1">Você está sacando</p>
                <p className="text-2xl font-bold text-gray-900 mb-3">{formatBRL(fees.grossAmount)}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Taxa ({fees.feeBps / 100}%)</span>
                    <span>-{formatBRL(fees.feeAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-100">
                    <span>Recebe via Pix</span>
                    <span className="text-green-600">{formatBRL(fees.netAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">Chave Pix</p>
                <p className="text-sm font-medium text-gray-900">{pixKey}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('amount')}
                  className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Confirmar saque
                </button>
              </div>
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
                  Processando saque de {formatBRL(effectiveAmount ?? 0)}
                </p>
                <ProgressTimeline steps={timelineSteps} />
              </div>

              {withdrawStatus === 'pix_sent' && fees && (
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
                    Saque confirmado!
                  </p>
                  <p className="text-sm text-green-600 mb-1">
                    {formatBRL(fees.netAmount)} enviado via Pix
                  </p>
                  <p className="text-xs text-green-500">
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
