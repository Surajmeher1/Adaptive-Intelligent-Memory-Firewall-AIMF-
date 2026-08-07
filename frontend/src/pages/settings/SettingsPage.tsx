import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Sun, Moon, Monitor, Sliders, Bell, Palette, RotateCcw, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSettingsStore, useThemeStore } from '@/store'
import { Card, CardTitle, Toggle, Divider, Button } from '@/components/ui'
import clsx from 'clsx'

// ─── Slider ───────────────────────────────────────────────────────────────────

interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
  color?: string
}

function Slider({ label, value, min = 0, max = 1, step = 0.01, onChange, color = '#6366f1' }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-white">{value.toFixed(2)}</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }}
        />
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-white shadow-md transition-all"
          style={{ left: `calc(${pct}% - 8px)`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-indigo-400">
            {icon}
          </div>
          <CardTitle>{title}</CardTitle>
        </div>
        <div className="space-y-5">{children}</div>
      </Card>
    </motion.div>
  )
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettingsStore()
  const { theme, setTheme } = useThemeStore()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    toast.success('Settings saved')
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    resetSettings()
    toast.success('Settings reset to defaults')
  }

  const totalWeight = Object.values(settings.amgs_weights).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-[820px] mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700/40 border border-white/[0.08]">
            <Settings className="h-4.5 w-4.5 text-slate-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">Preferences and pipeline configuration</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={handleReset}>
            Reset
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={saved ? <Check className="h-3.5 w-3.5" /> : undefined}
            onClick={handleSave}
          >
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* ── Appearance ─────────────────────────────────────────────── */}
      <Section title="Appearance" icon={<Palette className="h-4 w-4" />}>

        {/* Theme picker */}
        <div>
          <p className="text-xs font-medium text-slate-300 mb-3">Theme</p>
          <div className="flex gap-2">
            {([
              { value: 'dark',   label: 'Dark',   icon: Moon    },
              { value: 'light',  label: 'Light',  icon: Sun     },
              { value: 'system', label: 'System', icon: Monitor },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={clsx(
                  'flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-all',
                  theme === value
                    ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                    : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/[0.15] hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <Divider />

        <Toggle
          checked={settings.compact_mode}
          onChange={(v) => updateSettings({ compact_mode: v })}
          label="Compact Mode"
          description="Reduce spacing and padding for denser information display"
        />
        <Toggle
          checked={settings.animations_enabled}
          onChange={(v) => updateSettings({ animations_enabled: v })}
          label="Animations"
          description="Enable page transitions and micro-animations"
        />
      </Section>

      {/* ── Notifications ──────────────────────────────────────────── */}
      <Section title="Notifications" icon={<Bell className="h-4 w-4" />}>
        <Toggle
          checked={settings.notifications_enabled}
          onChange={(v) => updateSettings({ notifications_enabled: v })}
          label="Enable Notifications"
          description="Show in-app alerts for pipeline events and privacy triggers"
        />
      </Section>

      {/* ── AMGS Decision Thresholds ───────────────────────────────── */}
      <Section title="Decision Thresholds" icon={<Sliders className="h-4 w-4" />}>
        <p className="text-xs text-slate-500 -mt-2">
          Adjust the AMGS score cutoffs that determine routing decisions. Changes are applied to future analyses only.
        </p>

        <div className="space-y-5">
          {([
            { key: 'long_term',      label: 'Long-term Store ≥',   color: '#06b6d4' },
            { key: 'store',          label: 'Store ≥',             color: '#10b981' },
            { key: 'summarize',      label: 'Summarise ≥',         color: '#f59e0b' },
            { key: 'forget',         label: 'Forget ≤',            color: '#ef4444' },
            { key: 'encrypt',        label: 'Encrypt if risk ≥',   color: '#8b5cf6' },
            { key: 'reject_privacy', label: 'Reject if risk ≥',    color: '#dc2626' },
          ] as const).map(({ key, label, color }) => (
            <Slider
              key={key}
              label={label}
              value={settings.thresholds[key]}
              color={color}
              onChange={(v) =>
                updateSettings({ thresholds: { ...settings.thresholds, [key]: v } })
              }
            />
          ))}
        </div>

        <div className={clsx(
          'rounded-xl border px-4 py-3 text-xs',
          'border-amber-500/20 bg-amber-500/[0.05] text-amber-400'
        )}>
          ⚠️ Thresholds are applied to the mock pipeline. Connect backend to persist changes.
        </div>
      </Section>

      {/* ── AMGS Factor Weights ────────────────────────────────────── */}
      <Section title="AMGS Factor Weights" icon={<Sliders className="h-4 w-4" />}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-slate-500">
            Adjust relative importance of each scoring factor (total: {totalWeight.toFixed(2)})
          </p>
          <span className={clsx(
            'text-xs font-mono font-bold',
            Math.abs(totalWeight - 1) < 0.01 ? 'text-emerald-400' : 'text-amber-400'
          )}>
            {Math.abs(totalWeight - 1) < 0.01 ? '✓ Balanced' : `Σ = ${totalWeight.toFixed(2)}`}
          </span>
        </div>

        <div className="space-y-4">
          {([
            { key: 'usefulness', label: 'Usefulness',        color: '#6366f1' },
            { key: 'context',    label: 'Context Relevance', color: '#06b6d4' },
            { key: 'frequency',  label: 'Frequency',         color: '#10b981' },
            { key: 'novelty',    label: 'Novelty',           color: '#8b5cf6' },
            { key: 'redundancy', label: 'Redundancy',        color: '#f59e0b' },
            { key: 'privacy',    label: 'Privacy Risk',      color: '#ef4444' },
            { key: 'decay',      label: 'Temporal Decay',    color: '#06b6d4' },
          ] as const).map(({ key, label, color }) => (
            <Slider
              key={key}
              label={label}
              value={settings.amgs_weights[key]}
              max={0.5}
              step={0.01}
              color={color}
              onChange={(v) =>
                updateSettings({ amgs_weights: { ...settings.amgs_weights, [key]: v } })
              }
            />
          ))}
        </div>
      </Section>

    </div>
  )
}
