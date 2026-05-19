import type { BetFinancials } from '../helpers/financial'
import { formatBRL } from '../helpers/financial'

interface Props {
  financials: BetFinancials
  showPayout?: boolean
}

export function AmountBreakdown({ financials, showPayout = true }: Props) {
  const rows = [
    { label: 'Aposta (stake)', value: financials.stake },
    { label: `Taxa do perdedor (${financials.loserFeeBps / 100}%)`, value: financials.loserFee },
    { label: 'Depósito por jogador', value: financials.depositPerUser, highlight: true },
  ]

  if (showPayout) {
    rows.push(
      { label: 'Payout ao vencedor', value: financials.winnerPayout, highlight: false },
      { label: 'Taxa para a plataforma', value: financials.treasuryPayout, highlight: false },
    )
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
      {rows.map((row, i) => (
        <div
          key={i}
          className={`flex items-center justify-between text-sm ${
            row.highlight ? 'font-semibold text-gray-900 pt-2 border-t border-gray-200' : 'text-gray-600'
          }`}
        >
          <span>{row.label}</span>
          <span className={row.highlight ? 'text-primary-600' : ''}>
            {formatBRL(row.value)}
          </span>
        </div>
      ))}
    </div>
  )
}
