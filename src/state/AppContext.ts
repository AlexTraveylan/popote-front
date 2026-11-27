import { createContext, useContext } from "react"

export type Toast = { message: string; actionLabel?: string; onAction?: () => void }

export type AppState = {
  member: string
  members: readonly string[]
  generationEnabled: boolean
  day: string
  switchMember: () => void
  notify: (toast: Toast) => void
}

export const AppContext = createContext<AppState | null>(null)

export const useApp = (): AppState => {
  const state = useContext(AppContext)
  if (state === null) throw new Error("AppContext manquant")
  return state
}
