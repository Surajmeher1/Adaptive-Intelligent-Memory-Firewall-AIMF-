import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useSidebarStore } from '@/store'
import clsx from 'clsx'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
}

export default function RootLayout() {
  const location = useLocation()
  const { isCollapsed } = useSidebarStore()

  return (
    <div className="flex h-dvh overflow-hidden" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div
        className={clsx(
          'flex flex-col flex-1 min-w-0 transition-all duration-300',
          isCollapsed ? 'ml-0' : 'ml-0'
        )}
      >
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="min-h-full p-6 md:p-8"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
