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
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden bg-bg">
      {/* Blobs */}
      <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(255,184,48,0.2) 0%, transparent 65%)', top: '-120px', right: '-120px' }} />
      <div className="absolute w-[350px] h-[350px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(255,92,53,0.12) 0%, transparent 65%)', bottom: '-60px', left: '-60px' }} />

      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-10 z-10">
        <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-white font-bold text-base"
             style={{ boxShadow: '0 4px 12px rgba(255,92,53,0.35)' }}>
          ✦
        </div>
        <span className="font-display text-xl font-bold text-text">
          Prep<span className="text-accent">AI</span>
        </span>
      </div>

      <div className="bg-surface border-2 border-border rounded-2xl p-8 w-full max-w-sm z-10"
           style={{ boxShadow: '0 8px 40px rgba(26,22,18,0.1)' }}>
        <h2 className="font-display text-2xl font-bold mb-1 text-text">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="font-mono text-[12px] text-muted mb-7">
          {mode === 'login'
            ? 'Sign in to access your prep kits'
            : 'Start prepping smarter today'}
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-surface2 border border-border rounded-xl px-4 py-3 text-[14px] text-text placeholder-muted outline-none transition-all focus:border-accent focus:bg-white"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-surface2 border border-border rounded-xl px-4 py-3 text-[14px] text-text placeholder-muted outline-none transition-all focus:border-accent focus:bg-white"
          />
          {error && (
            <p className="font-mono text-[12px] text-warn text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-accent text-white rounded-xl py-3 text-[14px] font-semibold mt-1 disabled:opacity-40 transition-all hover:-translate-y-0.5"
            style={{ boxShadow: '0 4px 14px rgba(255,92,53,0.3)' }}
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>
        </form>

        <p className="font-mono text-[11px] text-muted text-center mt-5">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-accent hover:underline"
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
