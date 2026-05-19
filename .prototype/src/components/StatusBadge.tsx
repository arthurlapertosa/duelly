import type { BetStatus, DepositStatus } from '../types'

type Status = BetStatus | DepositStatus

const config: Record<Status, { label: string; bg: string; text: string }> = {
  InviteCreated: { label: 'Aguardando aceite', bg: 'bg-amber-50', text: 'text-amber-700' },
  InviteAcceptedPendingTx: { label: 'Assinatura pendente', bg: 'bg-blue-50', text: 'text-blue-700' },
  Funded: { label: 'Em andamento', bg: 'bg-blue-50', text: 'text-blue-700' },
  Resolved: { label: 'Finalizada', bg: 'bg-green-50', text: 'text-green-700' },
  Voided: { label: 'Anulada', bg: 'bg-gray-100', text: 'text-gray-600' },
  Expired: { label: 'Expirada', bg: 'bg-red-50', text: 'text-red-700' },
  awaiting_pix: { label: 'Aguardando Pix', bg: 'bg-amber-50', text: 'text-amber-700' },
  pix_confirmed: { label: 'Pix confirmado', bg: 'bg-blue-50', text: 'text-blue-700' },
  brl1_received: { label: 'BRL1 recebido', bg: 'bg-green-50', text: 'text-green-700' },
}

interface Props {
  status: Status
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: Props) {
  const c = config[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${c.bg} ${c.text} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
    >
      {c.label}
    </span>
  )
}
