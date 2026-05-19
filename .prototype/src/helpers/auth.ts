import type { AuthProvider, AuthResult, AuthSession } from '../types'

export const MOCK_AUTH_EMAIL = 'demo@duelly.app'
export const MOCK_AUTH_PASSWORD = 'duelly123'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function validateMockPasswordLogin(email: string, password: string): AuthResult {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    return { success: false, error: 'Informe seu email.' }
  }

  if (!emailPattern.test(normalizedEmail)) {
    return { success: false, error: 'Informe um email valido.' }
  }

  if (!password) {
    return { success: false, error: 'Informe sua senha.' }
  }

  if (normalizedEmail !== MOCK_AUTH_EMAIL || password !== MOCK_AUTH_PASSWORD) {
    return { success: false, error: 'Email ou senha invalidos.' }
  }

  return { success: true }
}

export function createMockAuthSession(provider: AuthProvider, email: string): AuthSession {
  return {
    provider,
    email: provider === 'google' ? MOCK_AUTH_EMAIL : normalizeEmail(email),
    loggedAt: new Date().toISOString(),
  }
}
