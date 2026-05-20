import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { AmountBreakdown } from '../components/AmountBreakdown'
import { MockTransactionSheet } from '../components/MockTransactionSheet'
import { calculateBetFinancials, formatBRL } from '../helpers/financial'

type Step = 'review' | 'signing' | 'permit' | 'done'

export function AcceptInvite() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const getBetByInviteCode = useStore((s) => s.getBetByInviteCode)
  const getTemplateById = useStore((s) => s.getTemplateById)
  const getUserById = useStore((s) => s.getUserById)
  const acceptBet = useStore((s) => s.acceptBet)
  const users = useStore((s) => s.users)

  const bet = getBetByInviteCode(id ?? '')
  const template = bet ? getTemplateById(bet.templateId) : null
  const creator = bet ? getUserById(bet.playerAId) : null
  const opponent = users.find((u) => u.id !== bet?.playerAId)

  const [step, setStep] = useState<Step>('review')

  if (!bet || !template || !creator) {
    return (
      <div className="pt-6 text-center">
        <p className="text-gray-400">Convite não encontrado</p>
      </div>
    )
  }

  if (step !== 'done' && step !== 'permit' && bet.status !== 'InviteCreated') {
    return (
      <div className="pt-6 text-center">
        <p className="text-gray-400">Este convite já foi aceito ou expirou.</p>
        <button
          onClick={() => navigate(`/bets/${bet.id}`)}
          className="mt-4 text-primary-600 font-medium text-sm"
        >
          Ver aposta →
        </button>
      </div>
    )
  }

  const financials = calculateBetFinancials(bet.stake, template.loserFeeBps)
  const creatorOutcome = template.outcomes[bet.playerAOutcomeIndex]
  const opponentOutcomeIndex = bet.playerAOutcomeIndex === 0 ? 1 : 0
  const opponentOutcome = template.outcomes[opponentOutcomeIndex]

  const handleAccept = () => setStep('signing')

  const handleSignConfirm = () => setStep('permit')

  const handlePermitConfirm = () => {
    acceptBet(bet.id)
    setStep('done')
  }

  return (
    <div className="pt-4 pb-8">
      {step === 'review' && (
        <>
          <button onClick={() => navigate('/home')} className="flex items-center gap-1 text-gray-500 mb-4">
            <ArrowLeft size={18} />
            <span className="text-sm">Voltar</span>
          </button>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 flex items-start gap-2">
            <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Você está simulando a visão do oponente ({opponent?.name}).
            </p>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-5">Convite de aposta</h1>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 space-y-3">
            <div>
              <p className="text-xs text-gray-400">Criado por</p>
              <p className="text-sm font-semibold text-gray-900">{creator.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{creator.name} aposta em</p>
              <p className="text-sm font-semibold text-primary-600">{creatorOutcome}</p>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400">Disponível para você</p>
              <p className="text-sm font-semibold text-green-600">{opponentOutcome}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-sm font-medium text-gray-900 mb-3">{template.title}</p>
            <AmountBreakdown financials={financials} />
          </div>

          <div className="bg-gray-50 rounded-xl p-3 mb-6 flex items-center justify-between">
            <span className="text-sm text-gray-600">Seu saldo</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatBRL(opponent?.balanceBRL1 ?? 0)}
            </span>
          </div>

          <button
            onClick={handleAccept}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-2xl transition-colors"
          >
            Aceitar aposta
          </button>
        </>
      )}

      {step === 'signing' && (
        <MockTransactionSheet
          type="betAcceptance"
          details={{
            Template: template.title,
            Resultado: opponentOutcome,
            Stake: formatBRL(bet.stake),
          }}
          onConfirm={handleSignConfirm}
          onCancel={() => setStep('review')}
        />
      )}

      {step === 'permit' && (
        <MockTransactionSheet
          type="permit"
          details={{
            Token: 'BRL1',
            Valor: formatBRL(financials.depositPerUser),
            Spender: 'DuellyBetting.sol',
          }}
          onConfirm={handlePermitConfirm}
          onCancel={() => setStep('review')}
        />
      )}

      {step === 'done' && (
        <div className="text-center pt-8">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Aposta aceita!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Ambos os jogadores depositaram. A aposta está ativa.
          </p>
          <button
            onClick={() => navigate(`/bets/${bet.id}`)}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Ver aposta
          </button>
        </div>
      )}
    </div>
  )
}
