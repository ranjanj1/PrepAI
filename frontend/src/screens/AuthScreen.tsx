import { useState } from 'react'
import { login, register } from '../api'

interface Props {
  onAuth: (token: string) => void
}

export function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const tok = mode === 'login' ? await login(email, password) : await register(email, password)
      onAuth(tok)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative">
      {/* Ambient glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-accent/[0.05] blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] pointer-events-none" />

      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-12 z-10">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-bg font-bold text-base">✦</div>
        <span className="text-lg font-bold tracking-wide">
          Prep<span className="text-accent">AI</span>
        </span>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-sm z-10">
        <h2 className="text-xl font-bold mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="font-mono text-[12px] text-muted mb-6">
          {mode === 'login' ? 'Sign in to access your prep kits' : 'Start building your interview edge'}
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-bg border border-border rounded-xl px-4 py-3 font-mono text-[13px] text-text placeholder-muted outline-none focus:border-accent transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-bg border border-border rounded-xl px-4 py-3 font-mono text-[13px] text-text placeholder-muted outline-none focus:border-accent transition-colors"
          />

          {error && (
            <p className="font-mono text-[11px] text-warn">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-bg font-bold text-[13px] rounded-xl py-3 mt-1 transition-opacity disabled:opacity-60 hover:opacity-85"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <p className="font-mono text-[11px] text-muted text-center mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-accent hover:underline"
          >
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  )
}
