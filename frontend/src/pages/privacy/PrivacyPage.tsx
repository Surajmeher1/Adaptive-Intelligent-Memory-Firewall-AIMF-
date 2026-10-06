import { motion } from 'framer-motion'
import { Shield, Lock, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useMemories } from '@/hooks/useAIMF'
import { Card, CardTitle, CardDescription, SensitivityBadge, ProgressBar, ErrorState, SkeletonStat } from '@/components/ui'
import clsx from 'clsx'

const PRIVACY_RULES = [
  { id: 'pia-1',  label: 'PII Detection',              status: 'pass',  detail: 'Aadhar, PAN, passport patterns detected and flagged' },
  { id: 'pia-2',  label: 'Financial Data Encryption',  status: 'pass',  detail: 'All credit card and bank data encrypted at rest'       },
  { id: 'pia-3',  label: 'Medical Data Protection',    status: 'pass',  detail: 'Health records stored with access controls'            },
  { id: 'pia-4',  label: 'Location Data Control',      status: 'warn',  detail: 'Home address stored — consider automatic expiry'       },
  { id: 'pia-5',  label: 'Regulatory Compliance',      status: 'pass',  detail: 'DPDP Act 2023 rules applied for government IDs'        },
  { id: 'pia-6',  label: 'Data Minimisation',          status: 'pass',  detail: 'REJECT_PRIVACY applied to 132 excessive collection attempts' },
]

export default function PrivacyPage() {
  const { data, isLoading, isError, refetch } = useMemories({ sensitivity: 'critical', pageSize: 6 })

  if (isError) return <ErrorState onRetry={refetch} />

  const criticalMemories = data?.items ?? []

  return (
    <div className="max-w-[1100px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/20">
          <Shield className="h-4.5 w-4.5 text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Privacy Centre</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sensitive data governance and compliance overview</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          : [
              { label: 'Critical Memories',  value: '2',   color: 'text-red-400',    icon: AlertTriangle },
              { label: 'High Sensitivity',   value: '1',   color: 'text-amber-400',  icon: Eye           },
              { label: 'Encrypted Total',    value: '312', color: 'text-indigo-400', icon: Lock          },
              { label: 'Rejected (Privacy)', value: '132', color: 'text-emerald-400',icon: Shield        },
            ].map(({ label, value, color, icon: Icon }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
                  <Icon className={clsx('h-3.5 w-3.5', color)} />
                </div>
                <p className={clsx('text-2xl font-bold font-mono', color)}>{value}</p>
              </motion.div>
            ))
        }
      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        {/* Privacy rules audit */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full">
            <CardTitle>Privacy Impact Assessment</CardTitle>
            <CardDescription className="mb-4">Automated compliance checks</CardDescription>
            <div className="space-y-3">
              {PRIVACY_RULES.map((rule) => (
                <div key={rule.id} className="flex items-start gap-3 rounded-lg p-3 bg-white/[0.02] border border-white/[0.05]">
                  {rule.status === 'pass'
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    : <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">{rule.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{rule.detail}</p>
                  </div>
                  <span className={clsx(
                    'text-[10px] rounded-full px-2 py-0.5 font-semibold flex-shrink-0',
                    rule.status === 'pass'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  )}>
                    {rule.status === 'pass' ? 'PASS' : 'WARN'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Critical memories list */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardTitle>Critical Sensitivity Memories</CardTitle>
            <CardDescription className="mb-4">Highest privacy-risk items in vault</CardDescription>
            <div className="space-y-3">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 skeleton rounded-xl" />
                  ))
                : criticalMemories.map((m) => (
                    <div key={m.id} className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                        <SensitivityBadge level={m.sensitivity} />
                        <span className="ml-auto text-[10px] font-mono text-red-400">
                          risk: {m.factors.privacy_risk.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {m.is_encrypted ? '🔒 [encrypted content]' : m.content}
                      </p>
                      <ProgressBar value={m.factors.privacy_risk} max={1} color="red" size="sm" />
                    </div>
                  ))
              }
              {!isLoading && criticalMemories.length === 0 && (
                <div className="py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-emerald-400">No critical memories found</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
