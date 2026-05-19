import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, CheckCircle2, Trophy, RotateCcw, Info } from 'lucide-react'
import { useStore } from '../store/useStore'
import { StatusBadge } from '../components/StatusBadge'
import { AmountBreakdown } from '../components/AmountBreakdown'
import { ProgressTimeline, type TimelineStep } from '../components/ProgressTimeline'
import { calculateBetFinancials, formatBRL } from '../helpers/financial'
import { formatDateTime } from '../helpers/date'

export function BetDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const bet = useStore((s) => s.getBetById(id ?? ''))
  const getTemplateById = useStore((s) => s.getTemplateById)
  const getUserById = useStore((s) => s.getUserById)
  const resolveBet = useStore((s) => s.resolveBet)

  const [showResolution, setShowResolution] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!bet) {
    return (
      <div className="pt-6 text-center">
        <p className="text-gray-400">Aposta não encontrada</p>
      </div>
    )
  }

  const template = getTemplateById(bet.templateId)
  const playerA = getUserById(bet.playerAId)
  const playerB = bet.playerBId ? getUserById(bet.playerBId) : null

  if (!template || !playerA) return null

  const financials = calculateBetFinancials(bet.stake, template.loserFeeBps)

  const timelineSteps: TimelineStep[] = [
    {
      label: 'Convite criado',
      sublabel: formatDateTime(bet.createdAt),
      completed: true,
    },
    {
      label: 'Aceite assinado',
      sublabel: bet.fundedAt ? formatDateTime(bet.fundedAt) : undefined,
      completed: bet.status !== 'InviteCreated',
      active: bet.status === 'InviteAcceptedPendingTx',
    },
    {
      label: 'Funding confirmado',
      sublabel: bet.fundedAt ? formatDateTime(bet.fundedAt) : undefined,
      completed: ['Funded', 'Resolved', 'Voided'].includes(bet.status),
      active: bet.status === 'InviteAcceptedPendingTx',
    },
    {
      label: 'Aguardando resolução',
      completed: ['Resolved', 'Voided'].includes(bet.status),
      active: bet.status === 'Funded',
    },
    {
      label: bet.status === 'Voided' ? 'Anulada (void)' : 'Resolvida',
      sublabel: bet.resolvedAt ? formatDateTime(bet.resolvedAt) : undefined,
      completed: ['Resolved', 'Voided'].includes(bet.status),
    },
  ]

  const handleCopy = () => {
    navigator.clipboard.writeText(`duelly.app/invite/${bet.inviteCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleResolve = (result: 'outcomeA' | 'outcomeB' | 'void') => {
    resolveBet(bet.id, result)
    setShowResolution(false)
  }

  const winner = bet.winnerId ? getUserById(bet.winnerId) : null

  return (
    <div className="pt-4 pb-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 mb-4">
        <ArrowLeft size={18} />
        <span className="text-sm">Voltar</span>
      </button>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">Detalhe da aposta</h1>
        <StatusBadge status={bet.status} size="md" />
      </div>

      <p className="text-sm text-gray-600 mb-5">{template.title}</p>

      {/* Players */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Jogador A</p>
            <p className="text-sm font-semibold text-gray-900">{playerA.name}</p>
            <p className="text-xs text-primary-600 mt-1">
              {template.outcomes[bet.playerAOutcomeIndex]}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Jogador B</p>
            {playerB ? (
              <>
                <p className="text-sm font-semibold text-gray-900">{playerB.name}</p>
                <p className="text-xs text-green-600 mt-1">
                  {bet.playerBOutcomeIndex != null
                    ? template.outcomes[bet.playerBOutcomeIndex]
                    : '—'}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Aguardando...</p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">Total em escrow</span>
          <span className="font-semibold text-gray-900">
            {formatBRL(playerB ? financials.depositPerUser * 2 : financials.depositPerUser)}
          </span>
        </div>
      </div>

      {/* Amount Breakdown */}
      <div className="mb-4">
        <AmountBreakdown financials={financials} />
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h3>
        <ProgressTimeline steps={timelineSteps} />
      </div>

      {/* Resolution info */}
      <div className="bg-gray-50 rounded-xl p-3 mb-5 flex items-start gap-2">
        <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500">
          Em produção, a resolução viria do Polymarket CTF on-chain. No protótipo, você pode simular manualmente.
        </p>
      </div>

      {/* Actions */}
      {bet.status === 'InviteCreated' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <span className="text-xs font-mono text-gray-700 flex-1 truncate">
              duelly.app/invite/{bet.inviteCode}
            </span>
            <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 shrink-0">
              {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
          <button
            onClick={() => navigate(`/invite/${bet.inviteCode}`)}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Simular aceite de outro usuário
          </button>
        </div>
      )}

      {bet.status === 'Funded' && !showResolution && (
        <button
          onClick={() => setShowResolution(true)}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-2xl transition-colors"
        >
          Simular resolução
        </button>
      )}

      {/* Resolution panel */}
      {showResolution && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Escolher resultado</h3>
          <button
            onClick={() => handleResolve('outcomeA')}
            className="w-full bg-primary-50 text-primary-700 font-semibold py-3 rounded-xl hover:bg-primary-100 transition-colors text-sm"
          >
            {template.outcomes[0]} venceu — {playerA.name} ganha
          </button>
          <button
            onClick={() => handleResolve('outcomeB')}
            className="w-full bg-green-50 text-green-700 font-semibold py-3 rounded-xl hover:bg-green-100 transition-colors text-sm"
          >
            {template.outcomes[1]} venceu — {playerB?.name ?? 'Jogador B'} ganha
          </button>
          <button
            onClick={() => handleResolve('void')}
            className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors text-sm"
          >
            Resultado ambíguo — anular (void)
          </button>
          <button
            onClick={() => setShowResolution(false)}
            className="w-full text-gray-500 text-sm py-2"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Resolved result */}
      {bet.status === 'Resolved' && winner && (
        <div className="bg-green-50 rounded-2xl p-5 text-center">
          <Trophy size={28} className="text-green-500 mx-auto mb-2" />
          <p className="text-lg font-bold text-green-800">{winner.name} venceu!</p>
          <div className="mt-3 space-y-1 text-sm">
            <p className="text-green-700">
              Payout: {formatBRL(bet.winnerPayout ?? 0)}
            </p>
            <p className="text-green-600">
              Taxa da plataforma: {formatBRL(bet.treasuryPayout ?? 0)}
            </p>
          </div>
        </div>
      )}

      {bet.status === 'Voided' && (
        <div className="bg-gray-100 rounded-2xl p-5 text-center">
          <RotateCcw size={28} className="text-gray-500 mx-auto mb-2" />
          <p className="text-lg font-bold text-gray-700">Aposta anulada</p>
          <p className="text-sm text-gray-500 mt-1">
            Reembolso completo: {formatBRL(financials.voidRefund)} por jogador
          </p>
          <p className="text-xs text-gray-400 mt-1">Plataforma recebe: R$ 0,00</p>
        </div>
      )}
    </div>
  )
}
