import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'

export default function PageLoader() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30"
        >
          <Activity className="h-5 w-5 text-white" />
        </motion.div>
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    </div>
  )
}
