import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  User,
  Template,
  Bet,
  ActivityItem,
  Deposit,
  DepositStatus,
  WithdrawStatus,
  AuthSession,
  AuthResult,
} from '../types'
import { mockUsers } from '../mocks/users'
import { mockTemplates } from '../mocks/templates'
import { mockBets } from '../mocks/bets'
import { mockActivities } from '../mocks/activity'
import { calculateBetFinancials, calculateDepositFees, calculateWithdrawFees } from '../helpers/financial'
import { MOCK_AUTH_EMAIL, createMockAuthSession, validateMockPasswordLogin } from '../helpers/auth'

interface AppState {
  isLoggedIn: boolean
  authSession: AuthSession | null
  currentUser: User
  users: User[]
  templates: Template[]
  bets: Bet[]
  activities: ActivityItem[]
  deposits: Deposit[]

  loginWithPassword: (email: string, password: string) => AuthResult
  loginWithGoogle: () => void
  logout: () => void
  addDeposit: (amount: number, onStatusChange: (status: DepositStatus) => void) => void
  withdraw: (amount: number, onStatusChange: (status: WithdrawStatus) => void) => void
  createBet: (templateId: string, outcomeIndex: number, stake: number) => string
  acceptBet: (betId: string) => void
  resolveBet: (betId: string, result: 'outcomeA' | 'outcomeB' | 'void') => void
  getBetById: (id: string) => Bet | undefined
  getBetByInviteCode: (code: string) => Bet | undefined
  getTemplateById: (id: string) => Template | undefined
  getUserById: (id: string) => User | undefined
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      authSession: null,
      currentUser: { ...mockUsers[0] },
      users: mockUsers.map((u) => ({ ...u })),
      templates: [...mockTemplates],
      bets: mockBets.map((b) => ({ ...b })),
      activities: [...mockActivities],
      deposits: [],

      loginWithPassword: (email, password) => {
        const validation = validateMockPasswordLogin(email, password)

        if (!validation.success) {
          return validation
        }

        set({
          isLoggedIn: true,
          authSession: createMockAuthSession('password', email),
        })

        return { success: true }
      },

      loginWithGoogle: () =>
        set({
          isLoggedIn: true,
          authSession: createMockAuthSession('google', MOCK_AUTH_EMAIL),
        }),

      logout: () =>
        set({
          isLoggedIn: false,
          authSession: null,
        }),

      addDeposit: (amount, onStatusChange) => {
        const fees = calculateDepositFees(amount)
        const deposit: Deposit = {
          id: `dep-${Date.now()}`,
          amountBRL: amount,
          status: 'awaiting_pix',
          createdAt: new Date().toISOString(),
        }

        set((state) => ({ deposits: [deposit, ...state.deposits] }))
        onStatusChange('awaiting_pix')

        setTimeout(() => {
          set((state) => ({
            deposits: state.deposits.map((d) =>
              d.id === deposit.id ? { ...d, status: 'pix_confirmed' as const } : d
            ),
          }))
          onStatusChange('pix_confirmed')

          setTimeout(() => {
            set((state) => ({
              deposits: state.deposits.map((d) =>
                d.id === deposit.id ? { ...d, status: 'brl1_received' as const } : d
              ),
              currentUser: {
                ...state.currentUser,
                balanceBRL1: state.currentUser.balanceBRL1 + fees.netAmount,
              },
              users: state.users.map((u) =>
                u.id === state.currentUser.id
                  ? { ...u, balanceBRL1: u.balanceBRL1 + fees.netAmount }
                  : u
              ),
              activities: [
                {
                  id: `act-${Date.now()}`,
                  type: 'deposit' as const,
                  title: 'Depósito recebido',
                  description: `Pix → BRL1 (taxa ${fees.feeBps / 100}%: ${fees.feeAmount.toFixed(2)})`,
                  amount: fees.netAmount,
                  timestamp: new Date().toISOString(),
                },
                ...state.activities,
              ],
            }))
            onStatusChange('brl1_received')
          }, 2000)
        }, 1500)
      },

      withdraw: (amount, onStatusChange) => {
        const fees = calculateWithdrawFees(amount)

        set((state) => ({
          currentUser: {
            ...state.currentUser,
            balanceBRL1: state.currentUser.balanceBRL1 - amount,
          },
          users: state.users.map((u) =>
            u.id === state.currentUser.id
              ? { ...u, balanceBRL1: u.balanceBRL1 - amount }
              : u
          ),
        }))
        onStatusChange('processing')

        setTimeout(() => {
          onStatusChange('brl1_burned')

          setTimeout(() => {
            set((state) => ({
              activities: [
                {
                  id: `act-${Date.now()}`,
                  type: 'withdrawal' as const,
                  title: 'Saque realizado',
                  description: `BRL1 → Pix (taxa ${fees.feeBps / 100}%: ${fees.feeAmount.toFixed(2)})`,
                  amount: -amount,
                  timestamp: new Date().toISOString(),
                },
                ...state.activities,
              ],
            }))
            onStatusChange('pix_sent')
          }, 2000)
        }, 1500)
      },

      createBet: (templateId, outcomeIndex, stake) => {
        const template = get().templates.find((t) => t.id === templateId)
        if (!template) return ''

        const financials = calculateBetFinancials(stake, template.loserFeeBps)
        const betId = `bet-${Date.now()}`
        const inviteCode = Math.random().toString(36).substring(2, 10)

        const newBet: Bet = {
          id: betId,
          templateId,
          playerAId: get().currentUser.id,
          playerAOutcomeIndex: outcomeIndex,
          stake,
          loserFee: financials.loserFee,
          status: 'InviteCreated',
          createdAt: new Date().toISOString(),
          inviteCode,
        }

        set((state) => ({
          bets: [newBet, ...state.bets],
          currentUser: {
            ...state.currentUser,
            balanceBRL1: state.currentUser.balanceBRL1 - financials.depositPerUser,
          },
          users: state.users.map((u) =>
            u.id === state.currentUser.id
              ? { ...u, balanceBRL1: u.balanceBRL1 - financials.depositPerUser }
              : u
          ),
          activities: [
            {
              id: `act-${Date.now()}`,
              type: 'bet_created' as const,
              title: 'Aposta criada',
              description: template.title,
              amount: -financials.depositPerUser,
              timestamp: new Date().toISOString(),
              betId,
            },
            ...state.activities,
          ],
        }))

        return betId
      },

      acceptBet: (betId) => {
        const bet = get().bets.find((b) => b.id === betId)
        if (!bet || bet.status !== 'InviteCreated') return

        const template = get().templates.find((t) => t.id === bet.templateId)
        if (!template) return

        const financials = calculateBetFinancials(bet.stake, template.loserFeeBps)
        const opponent = get().users.find((u) => u.id !== bet.playerAId)
        if (!opponent) return

        const opponentOutcomeIndex = bet.playerAOutcomeIndex === 0 ? 1 : 0
        const now = new Date().toISOString()

        set((state) => ({
          bets: state.bets.map((b) =>
            b.id === betId
              ? {
                  ...b,
                  playerBId: opponent.id,
                  playerBOutcomeIndex: opponentOutcomeIndex,
                  status: 'Funded' as const,
                  fundedAt: now,
                }
              : b
          ),
          users: state.users.map((u) =>
            u.id === opponent.id
              ? { ...u, balanceBRL1: u.balanceBRL1 - financials.depositPerUser }
              : u
          ),
          activities: [
            {
              id: `act-${Date.now()}-2`,
              type: 'bet_funded' as const,
              title: 'Aposta financiada',
              description: template.title,
              amount: -financials.depositPerUser,
              timestamp: now,
              betId,
            },
            {
              id: `act-${Date.now()}-1`,
              type: 'bet_accepted' as const,
              title: 'Convite aceito',
              description: `${opponent.name} aceitou a aposta`,
              timestamp: now,
              betId,
            },
            ...state.activities,
          ],
        }))
      },

      resolveBet: (betId, result) => {
        const bet = get().bets.find((b) => b.id === betId)
        if (!bet || bet.status !== 'Funded') return

        const template = get().templates.find((t) => t.id === bet.templateId)
        if (!template) return

        const financials = calculateBetFinancials(bet.stake, template.loserFeeBps)
        const now = new Date().toISOString()

        if (result === 'void') {
          set((state) => ({
            bets: state.bets.map((b) =>
              b.id === betId
                ? { ...b, status: 'Voided' as const, resolvedAt: now }
                : b
            ),
            currentUser: {
              ...state.currentUser,
              balanceBRL1:
                state.currentUser.balanceBRL1 +
                (state.currentUser.id === bet.playerAId || state.currentUser.id === bet.playerBId
                  ? financials.voidRefund
                  : 0),
            },
            users: state.users.map((u) => {
              if (u.id === bet.playerAId || u.id === bet.playerBId) {
                return { ...u, balanceBRL1: u.balanceBRL1 + financials.voidRefund }
              }
              return u
            }),
            activities: [
              {
                id: `act-${Date.now()}`,
                type: 'refund' as const,
                title: 'Aposta anulada — reembolso',
                description: template.title,
                amount: financials.voidRefund,
                timestamp: now,
                betId,
              },
              ...state.activities,
            ],
          }))
          return
        }

        const winnerId = result === 'outcomeA' ? bet.playerAId : bet.playerBId!
        const loserId = result === 'outcomeA' ? bet.playerBId! : bet.playerAId

        set((state) => ({
          bets: state.bets.map((b) =>
            b.id === betId
              ? {
                  ...b,
                  status: 'Resolved' as const,
                  winnerId,
                  winnerPayout: financials.winnerPayout,
                  treasuryPayout: financials.treasuryPayout,
                  resolvedAt: now,
                }
              : b
          ),
          currentUser: {
            ...state.currentUser,
            balanceBRL1:
              state.currentUser.balanceBRL1 +
              (state.currentUser.id === winnerId ? financials.winnerPayout : 0),
          },
          users: state.users.map((u) => {
            if (u.id === winnerId) {
              return { ...u, balanceBRL1: u.balanceBRL1 + financials.winnerPayout }
            }
            return u
          }),
          activities: [
            {
              id: `act-${Date.now()}-w`,
              type: 'bet_won' as const,
              title: `${state.users.find((u) => u.id === winnerId)?.name} venceu!`,
              description: template.title,
              amount: financials.winnerPayout,
              timestamp: now,
              betId,
            },
            {
              id: `act-${Date.now()}-l`,
              type: 'bet_lost' as const,
              title: `${state.users.find((u) => u.id === loserId)?.name} perdeu`,
              description: `Taxa da plataforma: ${financials.treasuryPayout.toFixed(2)}`,
              amount: -financials.depositPerUser,
              timestamp: now,
              betId,
            },
            ...state.activities,
          ],
        }))
      },

      getBetById: (id) => get().bets.find((b) => b.id === id),
      getBetByInviteCode: (code) => get().bets.find((b) => b.inviteCode === code),
      getTemplateById: (id) => get().templates.find((t) => t.id === id),
      getUserById: (id) => get().users.find((u) => u.id === id),
    }),
    {
      name: 'duelly-auth-session',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        authSession: state.authSession,
      }),
    }
  )
)
