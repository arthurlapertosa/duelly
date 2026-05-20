import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AmountBreakdown } from './AmountBreakdown'
import { calculateBetFinancials } from '../helpers/financial'

interface Props {
  loserFeeBps: number
  onSelect: (stake: number) => void
  selectedStake: number | null
}

const presets = [10, 25, 50, 100]

export function StakeCalculator({ loserFeeBps, onSelect, selectedStake }: Props) {
  const [customValue, setCustomValue] = useState('')

  const handleCustom = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '')
    setCustomValue(cleaned)
    const num = Number(cleaned)
    if (num > 0) onSelect(num)
  }

  const financials = selectedStake
    ? calculateBetFinancials(selectedStake, loserFeeBps)
    : null

  return (
    <motion.div layout className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Valor da aposta
        </label>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {presets.map((val) => (
            <motion.button
              key={val}
              onClick={() => {
                setCustomValue('')
                onSelect(val)
              }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                selectedStake === val && !customValue
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            >
              R${val}
            </motion.button>
          ))}
        </div>
        <motion.div layout className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            R$
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Outro valor"
            value={customValue}
            onChange={(e) => handleCustom(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </motion.div>
      </div>

      <AnimatePresence initial={false}>
        {financials && (
          <motion.div
            key={selectedStake}
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <AmountBreakdown financials={financials} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
