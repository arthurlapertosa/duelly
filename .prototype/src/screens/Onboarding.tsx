import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { LoaderCircle, Lock, Mail, Shield, Users, Zap } from 'lucide-react'
import { validateMockPasswordLogin, MOCK_AUTH_EMAIL, MOCK_AUTH_PASSWORD } from '../helpers/auth'

export function Onboarding() {
  const navigate = useNavigate()
  const loginWithPassword = useStore((s) => s.loginWithPassword)
  const loginWithGoogle = useStore((s) => s.loginWithGoogle)
  const [email, setEmail] = useState(MOCK_AUTH_EMAIL)
  const [password, setPassword] = useState(MOCK_AUTH_PASSWORD)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingProvider, setPendingProvider] = useState<'password' | 'google' | null>(null)

  const handlePasswordLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validateMockPasswordLogin(email, password)

    if (!validation.success) {
      setError(validation.error)
      return
    }

    setError('')
    setPendingProvider('password')
    setIsSubmitting(true)

    window.setTimeout(() => {
      const result = loginWithPassword(email, password)

      if (!result.success) {
        setError(result.error)
        setPendingProvider(null)
        setIsSubmitting(false)
        return
      }

      navigate('/home')
    }, 450)
  }

  const handleGoogleLogin = () => {
    setError('')
    setPendingProvider('google')
    setIsSubmitting(true)

    window.setTimeout(() => {
      loginWithGoogle()
      navigate('/home')
    }, 700)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-8">
        <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mb-6">
          <Zap size={28} className="text-white" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Duelly</h1>
        <p className="text-base text-gray-500 text-center mb-10 max-w-xs leading-relaxed">
          Apostas 1x1 com amigos, liquidação automática e saldo em reais digitais.
        </p>

        <div className="w-full max-w-xs space-y-4 mb-12">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
              <Users size={16} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Desafie amigos</p>
              <p className="text-xs text-gray-500">Crie apostas 1x1 sobre qualquer tema</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
              <Shield size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Seguro e transparente</p>
              <p className="text-xs text-gray-500">Fundos em escrow, resolução automática</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
              <Zap size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Saldo em BRL1</p>
              <p className="text-xs text-gray-500">Reais digitais na blockchain Polygon</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700 mb-1">
              Modo demo
            </p>
            <p className="text-sm text-primary-900">
              Use <span className="font-semibold">{MOCK_AUTH_EMAIL}</span> e senha{' '}
              <span className="font-semibold">{MOCK_AUTH_PASSWORD}</span>.
            </p>
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 mb-1.5 block">Email</span>
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 focus-within:border-primary-500 transition-colors">
                <Mail size={16} className="text-gray-400 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  className="w-full border-0 bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  disabled={isSubmitting}
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-gray-600 mb-1.5 block">Senha</span>
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 focus-within:border-primary-500 transition-colors">
                <Lock size={16} className="text-gray-400 shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  className="w-full border-0 bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  disabled={isSubmitting}
                />
              </div>
            </label>

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition-colors text-base flex items-center justify-center gap-2"
            >
              {pendingProvider === 'password' ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar com email'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">ou</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50 transition-colors flex items-center justify-center gap-3"
          >
            {pendingProvider === 'google' ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                Conectando com Google...
              </>
            ) : (
              <>
                <span className="grid h-5 w-5 place-items-center rounded-full border border-gray-200 bg-white text-[11px] font-bold text-gray-700">
                  G
                </span>
                Continuar com Google
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-400 pb-6">
        Protótipo — dados simulados
      </p>
    </div>
  )
}
