import { Lightbulb } from 'lucide-react'

const SAMPLES = [
  { label: 'Preference',   text: 'I prefer Python over JavaScript for backend development tasks and always use FastAPI for REST APIs.' },
  { label: 'Sensitive',    text: 'My Aadhar card number is 4521 8834 9921 3847.' },
  { label: 'Temporal',     text: 'Meeting with the design team scheduled for tomorrow at 3pm to review dashboard mockups.' },
  { label: 'Financial',    text: 'My HDFC credit card ending in 4832 has a limit of ₹2,00,000.' },
  { label: 'Long-term',    text: 'I consistently approach problems by breaking them into smaller sub-problems and solving each independently.' },
  { label: 'Factual',      text: 'The capital of Maharashtra is Mumbai. The city has a population of over 20 million people.' },
]

export default function SamplePrompts({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 uppercase tracking-wider">
        <Lightbulb className="h-3 w-3" />
        Try a sample
      </div>
      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            onClick={() => onSelect(s.text)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:border-indigo-500/30 hover:bg-indigo-500/[0.06] transition-all duration-150"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
