import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, CheckCircle2, UserPlus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { AmountBreakdown } from '../components/AmountBreakdown'
import { MockTransactionSheet } from '../components/MockTransactionSheet'
import { calculateBetFinancials, formatBRL } from '../helpers/financial'

type Step = 'review' | 'signing' | 'permit' | 'done'

export function CreateInvite() {
  const navigate = useNavigate()
  const location = useLocation()
  const { templateId, outcomeIndex, stake } = (location.state ?? {}) as {
    templateId: string
    outcomeIndex: number
    stake: number
  }

  const getTemplateById = useStore((s) => s.getTemplateById)
  const createBet = useStore((s) => s.createBet)
  const template = getTemplateById(templateId)

  const [step, setStep] = useState<Step>('review')
  const [betId, setBetId] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string>('')
  const [copied, setCopied] = useState(false)

  if (!template) {
    return (
      <div className="pt-6 text-center">
        <p className="text-gray-400">Template não encontrado</p>
      </div>
    )
  }

  const financials = calculateBetFinancials(stake, template.loserFeeBps)
  const chosenOutcome = template.outcomes[outcomeIndex]

  const handleSign = () => setStep('signing')

  const handleSignConfirm = () => setStep('permit')

  const handlePermitConfirm = () => {
    const id = createBet(templateId, outcomeIndex, stake)
    const bet = useStore.getState().getBetById(id)
    setBetId(id)
    setInviteCode(bet?.inviteCode ?? '')
    setStep('done')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`duelly.app/invite/${inviteCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="pt-4 pb-8">
      {step !== 'done' && (
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 mb-4">
          <ArrowLeft size={18} />
          <span className="text-sm">Voltar</span>
        </button>
      )}

      {step === 'review' && (
        <>
          <h1 className="text-xl font-bold text-gray-900 mb-5">Confirmar aposta</h1>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-xs text-gray-400 mb-1">Você aposta em</p>
            <p className="text-base font-semibold text-primary-600 mb-3">{chosenOutcome}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{template.title}</p>
          </div>

          <AmountBreakdown financials={financials} />

          <p className="text-xs text-gray-400 text-center mt-3 mb-5">
            {formatBRL(financials.depositPerUser)} será reservado do seu saldo
          </p>

          <button
            onClick={handleSign}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-2xl transition-colors"
          >
            Assinar e criar aposta
          </button>
        </>
      )}

      {step === 'signing' && (
        <MockTransactionSheet
          type="betOffer"
          details={{
            Template: template.title,
            Resultado: chosenOutcome,
            Stake: formatBRL(stake),
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Aposta criada!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Compartilhe o link abaixo para que seu oponente aceite.
          </p>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <p className="text-xs text-gray-400 mb-2">Link do convite</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="text-sm font-mono text-gray-700 flex-1 truncate">
                duelly.app/invite/{inviteCode}
              </span>
              <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 shrink-0">
                {copied ? (
                  <CheckCircle2 size={18} className="text-green-500" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-4 mb-6 text-left">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus size={14} className="text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Aguardando outro jogador</span>
            </div>
            <p className="text-xs text-amber-600">
              A aposta será ativada quando alguém aceitar o convite.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate(`/bets/${betId}`)}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Ver aposta
            </button>
            <button
              onClick={() => {
                const bet = useStore.getState().getBetById(betId ?? '')
                if (bet) navigate(`/invite/${bet.inviteCode}`)
              }}
              className="w-full bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Simular aceite de outro usuário
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
