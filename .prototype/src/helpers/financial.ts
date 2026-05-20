export interface BetFinancials {
  stake: number
  loserFeeBps: number
  loserFee: number
  depositPerUser: number
  winnerPayout: number
  treasuryPayout: number
  voidRefund: number
}

export function calculateBetFinancials(stake: number, loserFeeBps: number): BetFinancials {
  const loserFee = (stake * loserFeeBps) / 10_000
  const depositPerUser = stake + loserFee
  const winnerPayout = 2 * stake + loserFee
  const treasuryPayout = loserFee
  const voidRefund = stake + loserFee
  return { stake, loserFeeBps, loserFee, depositPerUser, winnerPayout, treasuryPayout, voidRefund }
}

export const PLATFORM_DEPOSIT_FEE_BPS = 100
export const PLATFORM_WITHDRAW_FEE_BPS = 150

export interface TransferFees {
  grossAmount: number
  feeBps: number
  feeAmount: number
  netAmount: number
}

export function calculateDepositFees(amount: number): TransferFees {
  const feeAmount = (amount * PLATFORM_DEPOSIT_FEE_BPS) / 10_000
  return { grossAmount: amount, feeBps: PLATFORM_DEPOSIT_FEE_BPS, feeAmount, netAmount: amount - feeAmount }
}

export function calculateWithdrawFees(amount: number): TransferFees {
  const feeAmount = (amount * PLATFORM_WITHDRAW_FEE_BPS) / 10_000
  return { grossAmount: amount, feeBps: PLATFORM_WITHDRAW_FEE_BPS, feeAmount, netAmount: amount - feeAmount }
}

export function formatBRL(amount: number): string {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
