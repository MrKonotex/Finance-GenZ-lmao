import { create } from 'zustand'

interface AppStore {
  alertCount: number
  setAlertCount: (n: number) => void
  wsConnected: boolean
  setWsConnected: (v: boolean) => void
  prices: Record<string, number>
  updatePrice: (asset: string, price: number) => void
}

export const useAppStore = create<AppStore>((set) => ({
  alertCount: 0,
  setAlertCount: (n) => set({ alertCount: n }),
  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),
  prices: {},
  updatePrice: (asset, price) =>
    set((state) => ({ prices: { ...state.prices, [asset]: price } })),
}))
