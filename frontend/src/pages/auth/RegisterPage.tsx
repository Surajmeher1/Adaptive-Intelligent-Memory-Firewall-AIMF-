import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Mail, Lock, Eye, EyeOff, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isAuthenticated, user } = useAuthStore()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => { document.title = 'Sign Up — AIMF' }, [])

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'ADMIN' ? '/dashboard' : '/chat', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22d3ee', '#34d399']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !password) { setError('Please fill in all fields.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError(''); setLoading(true)
    try {
      await register(email, password, name)
      const currentUser = useAuthStore.getState().user
      navigate(currentUser?.role === 'ADMIN' ? '/dashboard' : '/chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0a0d14 60%, #0f172a 100%)' }}>

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', filter: 'blur(80px)' }} />
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
            style={{ background: 'linear-gradient(135deg, #06b6d4, #4f46e5)', boxShadow: '0 0 40px rgba(6,182,212,0.35)' }}>
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-sm text-slate-400 mt-1">Start exploring the AIMF Dashboard</p>
        </div>

        <div className="rounded-2xl p-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">


            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-red-300"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
              </motion.div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Full name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all"
                        style={{ background: i <= strength ? strengthColor[strength] : 'rgba(255,255,255,0.1)' }} />
                    ))}
                  </div>
                  <p className="text-[10px]" style={{ color: strengthColor[strength] }}>{strengthLabel[strength]}</p>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                {confirm && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {confirm === password
                      ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                      : <AlertCircle className="h-4 w-4 text-red-400" />
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="group w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.01] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #4f46e5 100%)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
            >
              {loading ? (
                <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating account…</>
              ) : (
                <>Create Account <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Sign in</Link>
        </p>
        <p className="text-center mt-3">
          <Link to="/" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">← Back to landing page</Link>
        </p>
      </motion.div>
    </div>
  )
}
