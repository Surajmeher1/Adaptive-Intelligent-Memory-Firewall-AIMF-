import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import {
  Shield, Brain, Lock, Database, Activity,
  Zap, Clock, Eye, CheckCircle, ArrowRight,
  Network, Cpu, Code2, ExternalLink, BookOpen, Mail,
} from 'lucide-react'

// ─── Animated Hero Illustration ──────────────────────────────────────────────
function CyberIllustration() {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square">
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* SVG network */}
      <svg viewBox="0 0 400 400" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 30px rgba(79,70,229,0.3))' }}>
        <defs>
          <radialGradient id="shieldGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.6" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Connection lines */}
        {[
          [200,200, 80,120], [200,200, 320,80],  [200,200, 340,200],
          [200,200, 300,320],[200,200, 100,300],  [200,200, 60,200],
        ].map(([x1,y1,x2,y2], i) => (
          <motion.line
            key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="url(#nodeGrad)" strokeWidth="1" strokeOpacity="0.4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 1, 0] }}
            transition={{ duration: 3, delay: i * 0.4, repeat: Infinity, repeatDelay: 1 }}
          />
        ))}

        {/* Orbit rings */}
        {[70, 110, 145].map((r, i) => (
          <motion.circle
            key={i} cx="200" cy="200" r={r}
            fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="1"
            strokeDasharray="4 8"
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            style={{ transformOrigin: '200px 200px' }}
            transition={{ duration: 20 + i * 5, repeat: Infinity, ease: 'linear' }}
          />
        ))}

        {/* Satellite nodes */}
        {[
          { cx: 80,  cy: 120, delay: 0   },
          { cx: 320, cy: 80,  delay: 0.5 },
          { cx: 340, cy: 200, delay: 1   },
          { cx: 300, cy: 320, delay: 1.5 },
          { cx: 100, cy: 300, delay: 2   },
          { cx: 60,  cy: 200, delay: 2.5 },
        ].map((n, i) => (
          <motion.g key={i}>
            <motion.circle
              cx={n.cx} cy={n.cy} r="18"
              fill="rgba(6,182,212,0.12)" stroke="#06b6d4" strokeWidth="1.5"
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, delay: n.delay, repeat: Infinity }}
              style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
            />
            <circle cx={n.cx} cy={n.cy} r="5" fill="#06b6d4" filter="url(#glow)" />
          </motion.g>
        ))}

        {/* Central Shield */}
        <motion.g
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '200px 200px' }}
        >
          {/* Shield body */}
          <motion.path
            d="M200 150 L240 165 L240 205 Q240 235 200 250 Q160 235 160 205 L160 165 Z"
            fill="url(#shieldGrad)" stroke="rgba(165,180,252,0.6)" strokeWidth="2"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* Lock icon inside shield */}
          <rect x="188" y="192" width="24" height="18" rx="3"
            fill="white" fillOpacity="0.9" />
          <path d="M192 192 L192 186 Q192 180 200 180 Q208 180 208 186 L208 192"
            fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="200" cy="201" r="3" fill="rgba(79,70,229,0.8)" />
        </motion.g>

        {/* Pulsing rings from center */}
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i} cx="200" cy="200" r="40"
            fill="none" stroke="rgba(99,102,241,0.4)" strokeWidth="2"
            initial={{ r: 40, opacity: 0.6 }}
            animate={{ r: [40, 140], opacity: [0.5, 0] }}
            transition={{
              duration: 3,
              delay: i * 1,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Data packets moving along lines */}
        {[[200,200,80,120],[200,200,320,80],[200,200,340,200]].map(([x1,y1,x2,y2], i) => (
          <motion.circle
            key={i} r="4" fill="#06b6d4" filter="url(#glow)"
            animate={{
              cx: [x1, x2, x1],
              cy: [y1, y2, y1],
            }}
            transition={{ duration: 2.5, delay: i * 0.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </svg>
    </div>
  )
}

// ─── Section wrapper with scroll animation ───────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Gradient heading ─────────────────────────────────────────────────────────
function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'linear-gradient(135deg, #818cf8 0%, #22d3ee 60%, #818cf8 100%)',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}>
      {children}
    </span>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const { scrollY } = useScroll()
  const bg = useTransform(scrollY, [0, 80], ['rgba(15,23,42,0)', 'rgba(15,23,42,0.95)'])

  return (
    <motion.nav
      style={{ backgroundColor: bg }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-transparent backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/30">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">AIMF</div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 leading-none">Memory Firewall</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden sm:block px-4 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)' }}
          >
            Sign Up
          </Link>
        </div>
      </div>
    </motion.nav>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Brain,      color: '#818cf8', bg: 'rgba(99,102,241,0.12)',  title: 'Adaptive Memory Governance',    desc: 'Dynamic AMGS scoring evaluates 7 factors to make intelligent routing decisions for every piece of information.' },
  { icon: Shield,     color: '#f87171', bg: 'rgba(239,68,68,0.10)',   title: 'Privacy Risk Analysis',         desc: 'Detects PII, financial data, and sensitive patterns using NLP. Applies DPDP Act 2023 compliance automatically.' },
  { icon: Lock,       color: '#34d399', bg: 'rgba(16,185,129,0.10)',  title: 'Sensitive Data Protection',     desc: 'AES-256 encryption triggered automatically when privacy risk exceeds threshold. Zero plaintext storage of critical data.' },
  { icon: Clock,      color: '#fbbf24', bg: 'rgba(245,158,11,0.10)',  title: 'Automatic Memory Lifecycle',    desc: 'Exponential temporal decay removes irrelevant memories. Configurable half-life prevents stale data accumulation.' },
  { icon: Eye,        color: '#22d3ee', bg: 'rgba(6,182,212,0.10)',   title: 'Context-Aware Decisions',       desc: 'Semantic deduplication via vector embeddings detects redundant memories before they are ever stored.' },
  { icon: Activity,   color: '#a78bfa', bg: 'rgba(139,92,246,0.10)',  title: 'Research Analytics Dashboard',  desc: 'Compare AIMF against 5 baseline algorithms. Real-time charts, F1 scores, and privacy preservation metrics.' },
]

const PIPELINE = [
  { step: '01', label: 'User Input',            desc: 'Text, conversation, or data enters the pipeline',             icon: Code2   },
  { step: '02', label: 'AI Analysis',           desc: 'NLP + embeddings extract features and semantic content',      icon: Brain   },
  { step: '03', label: 'Privacy Detection',     desc: 'PII scanner flags sensitive entities and calculates risk',    icon: Shield  },
  { step: '04', label: 'Memory Decision Engine',desc: 'AMGS score routes the memory: Store / Encrypt / Forget',     icon: Cpu     },
  { step: '05', label: 'Secure Storage',        desc: 'Tiered storage with access controls and audit logging',       icon: Database},
  { step: '06', label: 'Adaptive Retrieval',    desc: 'Context-aware recall with temporal decay weighting',         icon: Network },
]

const TECH_STACK = [
  { name: 'Python 3.12',  color: '#3b82f6', icon: '🐍' },
  { name: 'FastAPI',      color: '#10b981', icon: '⚡' },
  { name: 'React 19',     color: '#06b6d4', icon: '⚛️' },
  { name: 'TypeScript',   color: '#818cf8', icon: '𝙏𝙎' },
  { name: 'PostgreSQL',   color: '#60a5fa', icon: '🐘' },
  { name: 'SQLAlchemy',   color: '#f59e0b', icon: '🔗' },
  { name: 'spaCy',        color: '#34d399', icon: '📝' },
  { name: 'Transformers', color: '#f87171', icon: '🤖' },
  { name: 'Docker',       color: '#22d3ee', icon: '🐳' },
]


const WHY_ITEMS = [
  { title: 'Privacy by Design',      desc: 'Every memory decision considers privacy risk before storage. No sensitive data is stored without encryption.',    icon: Lock,    color: '#818cf8' },
  { title: 'Storage Efficiency',     desc: 'Redundant, outdated, or irrelevant memories are automatically pruned. Up to 40% reduction in storage overhead.',  icon: Database,color: '#34d399' },
  { title: 'Explainable Decisions',  desc: 'Every routing decision includes a human-readable explanation of why information was stored, encrypted or forgotten.', icon: Eye,  color: '#22d3ee' },
  { title: 'Regulatory Compliance',  desc: 'Built-in DPDP Act 2023 enforcement. Automatically handles government IDs, financial data, and medical records.',  icon: Shield,  color: '#f87171' },
]

// ─── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  useEffect(() => {
    document.title = 'AIMF — Adaptive Intelligent Memory Firewall'
  }, [])

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0a0d14 50%, #0f172a 100%)' }}>
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', filter: 'blur(60px)' }} />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center py-20">
            {/* Left — text */}
            <div className="space-y-8">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                B.Tech CSE Final Year Project — GIET University 2026
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                  Adaptive <br />
                  <GradientText>Intelligent Memory</GradientText>
                  <br />Firewall
                </h1>
              </motion.div>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-indigo-300 font-medium italic"
              >
                "Intelligent Memory Governance for Secure AI Systems"
              </motion.p>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-slate-400 leading-relaxed text-base max-w-lg"
              >
                AIMF is an intelligent cybersecurity framework that analyzes information
                before it is stored. It evaluates privacy risk, contextual relevance,
                usefulness, redundancy, and temporal importance to determine how
                information should be managed securely.
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap gap-4"
              >
                <Link
                  to="/login"
                  className="group flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/25"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                >
                  Login to Dashboard
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-slate-200 border border-white/10 bg-white/5 hover:border-indigo-500/40 hover:bg-white/8 transition-all duration-200"
                >
                  Create Account
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex gap-8 pt-4"
              >
                {[['7', 'AMGS Factors'], ['6', 'Decision Types'], ['89.9%', 'F1 Score']].map(([val, label]) => (
                  <div key={label}>
                    <div className="text-2xl font-bold font-mono text-indigo-300">{val}</div>
                    <div className="text-xs text-slate-500">{label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <CyberIllustration />
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="text-[10px] uppercase tracking-widest">Scroll</div>
          <div className="w-px h-8 bg-gradient-to-b from-slate-600 to-transparent" />
        </motion.div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────────────────────── */}
      <section className="py-28 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-indigo-400 mb-3">About the Project</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">What is AIMF?</h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-3xl mx-auto">
              Adaptive Intelligent Memory Firewall (AIMF) is a privacy-preserving memory management
              framework designed for intelligent systems. Unlike traditional storage that simply stores
              everything, AIMF intelligently routes each piece of information based on a comprehensive
              multi-factor analysis.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'STORE',           color: '#34d399', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  desc: 'High-value information is stored in long-term memory' },
              { label: 'STORE TEMPORARILY',color: '#fbbf24',bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  desc: 'Time-sensitive data with automatic expiry' },
              { label: 'ENCRYPT',         color: '#818cf8', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.2)',  desc: 'Sensitive PII stored with AES-256 encryption' },
              { label: 'SUMMARIZE',       color: '#22d3ee', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.2)',   desc: 'Redundant memories are condensed to save space' },
              { label: 'UPDATE',          color: '#f472b6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.2)', desc: 'Stale memories are updated with fresh context' },
              { label: 'FORGET',          color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   desc: 'Irrelevant or expired memories are pruned' },
            ].map((d, i) => (
              <FadeIn key={d.label} delay={i * 0.08}>
                <div
                  className="rounded-xl p-4 flex items-start gap-3 hover:scale-[1.02] transition-transform cursor-default"
                  style={{ background: d.bg, border: `1px solid ${d.border}` }}
                >
                  <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: d.color }} />
                  <div>
                    <p className="text-xs font-bold tracking-wider mb-1" style={{ color: d.color }}>{d.label}</p>
                    <p className="text-xs text-slate-400">{d.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section className="py-28 relative">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(79,70,229,0.04) 50%, transparent 100%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-indigo-400 mb-3">Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Key Features</h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.07}>
                <div
                  className="group relative rounded-2xl p-6 h-full hover:scale-[1.02] transition-all duration-300 cursor-default"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {/* hover glow */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${f.color}15 0%, transparent 60%)` }} />

                  <div className="relative z-10">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl mb-4"
                      style={{ background: f.bg, border: `1px solid ${f.color}30` }}>
                      <f.icon className="h-5 w-5" style={{ color: f.color }} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-indigo-400 mb-3">Pipeline</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">How AIMF Works</h2>
            <p className="text-slate-400 mt-4">Six-stage intelligent pipeline — from raw input to secure adaptive storage</p>
          </FadeIn>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-8 bottom-8 w-px hidden sm:block"
              style={{ background: 'linear-gradient(180deg, transparent, #4f46e5, #06b6d4, transparent)' }} />

            <div className="space-y-6">
              {PIPELINE.map((p, i) => (
                <FadeIn key={p.step} delay={i * 0.1}>
                  <div className="flex gap-6 items-start group">
                    <div className="flex-shrink-0 flex h-16 w-16 items-center justify-center rounded-2xl relative z-10"
                      style={{
                        background: 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(6,182,212,0.2))',
                        border: '1px solid rgba(99,102,241,0.3)',
                      }}>
                      <p.icon className="h-6 w-6 text-indigo-300" />
                    </div>
                    <div
                      className="flex-1 rounded-xl p-5 group-hover:border-indigo-500/30 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-mono text-indigo-400">{p.step}</span>
                        <h3 className="text-base font-bold text-white">{p.label}</h3>
                      </div>
                      <p className="text-sm text-slate-400">{p.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TECH STACK ────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-indigo-400 mb-3">Built With</p>
            <h2 className="text-3xl font-bold text-white">Technology Stack</h2>
          </FadeIn>
          <div className="flex flex-wrap justify-center gap-3">
            {TECH_STACK.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.06}>
                <div
                  className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 hover:scale-105 transition-transform cursor-default"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${t.color}30`,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-sm font-medium" style={{ color: t.color }}>{t.name}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY AIMF ──────────────────────────────────────────────────────── */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-indigo-400 mb-3">The Problem We Solve</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">Why AIMF?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Traditional AI systems store everything — including sensitive data, outdated information,
              and privacy-violating content. AIMF is the intelligent layer that fixes this.
            </p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY_ITEMS.map((w, i) => (
              <FadeIn key={w.title} delay={i * 0.1}>
                <div
                  className="rounded-2xl p-6 text-center hover:scale-[1.03] transition-transform"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl mb-4"
                    style={{ background: `${w.color}15`, border: `1px solid ${w.color}30` }}>
                    <w.icon className="h-5 w-5" style={{ color: w.color }} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{w.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{w.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-28 px-4">
        <FadeIn>
          <div
            className="max-w-3xl mx-auto rounded-3xl p-12 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.2) 0%, rgba(6,182,212,0.15) 100%)',
              border: '1px solid rgba(99,102,241,0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* BG glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.2) 0%, transparent 60%)' }} />
            <div className="relative z-10">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl mb-6"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)' }}>
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to experience AIMF?
              </h2>
              <p className="text-slate-300 mb-8 max-w-lg mx-auto">
                Explore the Adaptive Intelligent Memory Firewall dashboard — see real-time
                pipeline decisions, analytics, and privacy governance in action.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  to="/login"
                  className="group flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-indigo-500/30"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                >
                  Login
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white border border-white/20 bg-white/10 hover:bg-white/15 transition-all"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">AIMF</div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Adaptive Intelligent Memory Firewall</div>
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                A privacy-preserving memory management framework for intelligent AI systems.
                Final Year B.Tech CSE Project — GIET University, 2026.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Project</p>
              <div className="space-y-2.5">
                {[
                  { label: 'GitHub', href: 'https://github.com/Surajmeher1/Adaptive-Intelligent-Memory-Firewall-AIMF-', icon: ExternalLink },
                  { label: 'Documentation', href: '#', icon: BookOpen },
                  { label: 'Contact', href: '#', icon: Mail },
                ].map(({ label, href, icon: Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-400 transition-colors">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* App */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Application</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Login', to: '/login' },
                  { label: 'Sign Up', to: '/register' },
                  { label: 'Dashboard', to: '/dashboard' },
                ].map(({ label, to }) => (
                  <Link key={label} to={to}
                    className="block text-sm text-slate-500 hover:text-indigo-400 transition-colors">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <p>© 2026 Adaptive Intelligent Memory Firewall · Computer Science & Engineering · GIET University</p>
            <p>B.Tech Final Year Project</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
