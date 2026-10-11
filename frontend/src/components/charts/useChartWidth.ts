import { useEffect, useRef, useState } from 'react'

export function useChartWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(640)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const updateWidth = () => {
      setWidth(Math.max(280, element.getBoundingClientRect().width))
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) updateWidth()
    })
    updateWidth()
    observer.observe(element)
    window.addEventListener('resize', updateWidth)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [])

  return { ref, width }
}
