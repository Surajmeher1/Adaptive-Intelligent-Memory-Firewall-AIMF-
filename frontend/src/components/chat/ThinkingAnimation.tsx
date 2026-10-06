import { motion } from 'framer-motion'
import { Bot, Sparkles } from 'lucide-react'

export function ThinkingAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 items-start my-2"
    >
      {/* Bot Avatar */}
      <div
        className="flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center mt-0.5"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 0 16px rgba(99,102,241,0.15)',
        }}
      >
        <Bot size={15} className="text-indigo-300" />
      </div>

      {/* Thinking Bubble */}
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3 text-sm"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderBottomLeftRadius: '6px',
        }}
      >
        {/* Pulsing Dots */}
        <div className="flex items-center gap-1.5 py-0.5">
          <span
            className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDuration: '1s', animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDuration: '1s', animationDelay: '200ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDuration: '1s', animationDelay: '400ms' }}
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Sparkles size={12} className="text-indigo-400 animate-pulse" />
          <span>Thinking...</span>
        </div>
      </div>
    </motion.div>
  )
}
