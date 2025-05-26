'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from './navigation'

export function ConditionalNavigation() {
  const pathname = usePathname()
  
  // Don't show navigation on auth pages
  const hideNavigation = pathname.startsWith('/auth/')
  
  if (hideNavigation) {
    return null
  }
  
  return <Navigation />
}
