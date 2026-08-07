import { Link } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0a0d14] p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
        </div>
        <div>
          <h1 className="text-6xl font-bold text-white">404</h1>
          <p className="text-slate-400 mt-2">Page not found</p>
          <p className="text-slate-500 text-sm mt-1">
            The page you're looking for doesn't exist in this memory system.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
