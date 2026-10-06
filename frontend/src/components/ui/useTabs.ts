import { useState } from 'react'

export function useTabs(initial: string) {
  const [activeTab, setActiveTab] = useState(initial)
  return { activeTab, setActiveTab }
}
