import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, X, Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  type: 'betOffer' | 'betAcceptance' | 'permit' | 'funding'
  details?: Record<string, string>
  onConfirm: () => void
  onCancel: () => void
}

const titles: Record<Props['type'], string> = {
  betOffer: 'Confirmação segura da aposta',
  betAcceptance: 'Aceitar aposta',
  permit: 'Autorização de saldo',
  funding: 'Confirmar depósito',
}

const descriptions: Record<Props['type'], string> = {
  betOffer: 'Assinatura para criar sua oferta de aposta',
  betAcceptance: 'Assinatura para aceitar esta aposta',
  permit: 'Autorização para usar seu saldo nesta aposta',
  funding: 'Confirmar o envio de fundos para o escrow',
}

const technicalLabels: Record<Props['type'], string> = {
  betOffer: 'Mock: BetOffer EIP-712 signature',
  betAcceptance: 'Mock: BetAcceptance EIP-712 signature',
  permit: 'Mock: BRL1 ERC-2612 permit',
  funding: 'Mock: acceptBetWithPermits tx',
}

export function MockTransactionSheet({ type, details, onConfirm, onCancel }: Props) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleConfirm = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => {
        onConfirm()
      }, 600)
    }, 1200)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <motion.div
          className="absolute inset-0 bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
        />

        <motion.div
          className="relative w-full max-w-md bg-white rounded-t-3xl p-6"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        >
          <motion.div
            className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4"
            initial={{ width: 0 }}
            animate={{ width: 40 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          />

          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                >
                  <CheckCircle2 size={48} className="text-green-500 mb-2" />
                </motion.div>
                <p className="text-base font-semibold text-gray-900">Confirmado!</p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center"
                    initial={{ rotate: -180, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                  >
                    <Shield size={20} className="text-primary-600" />
                  </motion.div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {titles[type]}
                    </h3>
                    <p className="text-xs text-gray-500">{descriptions[type]}</p>
                  </div>
                </div>

                {details && (
                  <motion.div
                    className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    {Object.entries(details).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-gray-500">{key}</span>
                        <span className="text-gray-900 font-medium">{value}</span>
                      </div>
                    ))}
                  </motion.div>
                )}

                <p className="text-[10px] text-gray-400 text-center mb-4 font-mono">
                  {technicalLabels[type]}
                </p>

                <motion.button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
