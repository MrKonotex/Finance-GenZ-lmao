import { useEffect, useRef } from 'react'
import { useAppStore } from '../store'

export function useWebSocket(): { connected: boolean } {
  const setWsConnected = useAppStore((s) => s.setWsConnected)
  const updatePrice = useAppStore((s) => s.updatePrice)
  const wsConnected = useAppStore((s) => s.wsConnected)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let destroyed = false

    function connect() {
      if (destroyed) return
      try {
        const ws = new WebSocket('ws://localhost:8000/ws/prices')
        wsRef.current = ws

        ws.onopen = () => {
          if (!destroyed) setWsConnected(true)
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as Record<string, number>
            Object.entries(msg).forEach(([asset, price]) => {
              if (typeof price === 'number') updatePrice(asset, price)
            })
          } catch {
            // ignore malformed messages
          }
        }

        ws.onerror = () => {
          // handled in onclose
        }

        ws.onclose = () => {
          if (!destroyed) {
            setWsConnected(false)
            // reconnect after 3 seconds
            reconnectRef.current = setTimeout(connect, 3000)
          }
        }
      } catch {
        if (!destroyed) {
          setWsConnected(false)
          reconnectRef.current = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
      setWsConnected(false)
    }
  }, [setWsConnected, updatePrice])

  return { connected: wsConnected }
}
