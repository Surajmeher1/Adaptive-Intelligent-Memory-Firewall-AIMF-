import { motion } from 'framer-motion'
import {
  Brain, BookOpen, GraduationCap, Layers, Server, Globe,
} from 'lucide-react'
import { Card, CardTitle, Badge, Divider } from '@/components/ui'

const TECH_STACK = [
  { layer: 'Frontend',  items: ['React 19', 'TypeScript', 'Tailwind v4', 'Framer Motion', 'Recharts', 'TanStack Query'] },
  { layer: 'Backend',   items: ['FastAPI', 'Python 3.12', 'SQLAlchemy', 'Alembic', 'PostgreSQL', 'pgvector'] },
  { layer: 'AI / ML',   items: ['Sentence-Transformers', 'scikit-learn', 'FAISS', 'spaCy', 'ONNX Runtime'] },
  { layer: 'Infra',     items: ['Docker', 'docker-compose', 'Nginx', 'Uvicorn'] },
]

const FEATURES = [
  { title: 'AMGS Scoring',          desc: 'Composite 7-factor utility score that governs every memory routing decision.' },
  { title: 'Privacy Firewall',      desc: 'Automatic PII detection with DPDP Act 2023 compliance enforcement.'           },
  { title: 'Semantic Deduplication',desc: 'Vector embeddings detect redundant memories before storage.'                   },
  { title: 'Temporal Decay',        desc: 'Time-weighted relevance ensures ephemeral data is automatically forgotten.'    },
  { title: 'Adaptive Encryption',   desc: 'Tiered encryption triggered by sensitivity classification score.'              },
  { title: 'Decision Explainability',desc:'Every routing decision includes a human-readable explanation.'                 },
]

const layer_icons: Record<string, React.ElementType> = {
  Frontend: Globe,
  Backend:  Server,
  'AI / ML':Layers,
  Infra:    Layers,
}

export default function AboutPage() {
  return (
    <div className="max-w-[900px] mx-auto space-y-6">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.08] to-cyan-400/[0.04] p-8"
      >
        <div className="flex items-center gap-4 mb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/40 to-cyan-400/30 border border-indigo-500/30">
            <Brain className="h-7 w-7 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight">
              Adaptive Intelligent<br />Memory Firewall
            </h2>
            <p className="text-sm text-indigo-300 mt-0.5">AIMF · B.Tech CSE Final Year Project</p>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
          AIMF is an intelligent memory governance layer for AI conversational systems. It evaluates every
          piece of information an LLM would store using a multi-factor Adaptive Memory Governance Score
          (AMGS) and routes it to the appropriate memory tier — or discards it — based on utility,
          privacy risk, and temporal relevance.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge tone="indigo">React 19</Badge>
          <Badge tone="cyan">FastAPI</Badge>
          <Badge tone="emerald">Python 3.12</Badge>
          <Badge tone="default">B.Tech CSE 2026</Badge>
        </div>
      </motion.div>

      {/* Key Features */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-400" />
            Key Features
          </CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Tech Stack */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            Technology Stack
          </CardTitle>
          <div className="space-y-5">
            {TECH_STACK.map(({ layer, items }) => {
              const Icon = layer_icons[layer] ?? Layers
              return (
                <div key={layer}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-3.5 w-3.5 text-slate-500" />
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">{layer}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <span key={item} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </motion.div>

      {/* Academic */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <div className="flex items-start gap-4">
            <GraduationCap className="h-5 w-5 text-amber-400 flex-shrink-0 mt-1" />
            <div className="flex-1 space-y-1">
              <CardTitle>Academic Details</CardTitle>
              <Divider className="my-3" />
              {[
                ['Project Title', 'Adaptive Intelligent Memory Firewall (AIMF)'],
                ['Institution',   'B.Tech Computer Science & Engineering, 2026'],
                ['Domain',        'AI Systems · Privacy Engineering · LLM Memory'],
                ['Version',       'v1.0.0 · Frontend Demo Build'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-4 text-sm py-1.5">
                  <span className="text-slate-500 w-28 flex-shrink-0 text-xs">{label}</span>
                  <span className="text-slate-300">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

    </div>
  )
}
