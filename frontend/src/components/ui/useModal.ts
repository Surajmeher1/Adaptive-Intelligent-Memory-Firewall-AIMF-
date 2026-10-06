import { useState, useCallback } from 'react'

export function useModal(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((s) => !s), [])
  return { isOpen, open, close, toggle }
}
