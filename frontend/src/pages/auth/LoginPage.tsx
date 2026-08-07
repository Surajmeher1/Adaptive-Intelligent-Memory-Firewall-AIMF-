import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => { document.title = 'Login — AIMF' }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setError(''); setLoading(true)
    // Simulate auth delay — replace with real API call when backend is ready
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0a0d14 60%, #0f172a 100%)' }}>

      {/* BG glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)', filter: 'blur(80px)' }} />

      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', boxShadow: '0 0 40px rgba(79,70,229,0.4)' }}>
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to the AIMF Dashboard</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-red-300"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="group w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.01] disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 0 20px rgba(79,70,229,0.3)' }}
            >
              {loading ? (
                <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Signing in…</>
              ) : (
                <>Login to Dashboard <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign up
          </Link>
        </p>
        <p className="text-center mt-3">
          <Link to="/" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">← Back to landing page</Link>
        </p>
      </motion.div>
    </div>
  )
}
