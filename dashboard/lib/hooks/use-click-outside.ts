'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Ferme un panneau quand le pointeur ou le focus sort du conteneur,
 * ou quand Escape est pressé. Fonctionne même dans un header avec backdrop-blur
 * (contrairement à un overlay `fixed inset-0` piégé dans le stacking context).
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!enabled) return

    const onPointerDown = (event: PointerEvent) => {
      const el = ref.current
      if (!el) return
      const target = event.target
      if (target instanceof Node && !el.contains(target)) {
        onOutside()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOutside()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [enabled, onOutside, ref])
}
