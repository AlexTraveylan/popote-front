import { Option } from "effect"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useHousehold } from "./api/hooks"
import { ErrorNote, Loading } from "./components/ui"
import { today } from "./lib/dates"
import { readStoredMember, resolveMember, storeMember } from "./lib/member"
import { RecipesPage } from "./pages/RecipesPage"
import { ShoppingPage } from "./pages/ShoppingPage"
import { StockPage } from "./pages/StockPage"
import { TodayPage } from "./pages/TodayPage"
import { AppContext, type AppState, type Toast } from "./state/AppContext"

const PAGES = [
  { id: "aujourdhui", label: "Aujourd'hui", icon: "☀" },
  { id: "recettes", label: "Recettes", icon: "📖" },
  { id: "stock", label: "Stock", icon: "🧺" },
  { id: "courses", label: "Courses", icon: "🛒" },
] as const

type PageId = (typeof PAGES)[number]["id"]

const pageFromHash = (): PageId => {
  const hash = window.location.hash.replace("#", "")
  return PAGES.find((page) => page.id === hash)?.id ?? "aujourdhui"
}

function MemberGate({ members, onPick }: { members: readonly string[]; onPick: (member: string) => void }) {
  return (
    <main className="gate">
      <div className="gate-card">
        <p className="eyebrow">Popote</p>
        <h1>Qui cuisine ?</h1>
        <p className="muted">Ton choix est gardé sur cet appareil. Tu pourras changer à tout moment.</p>
        <div className="gate-members">
          {members.map((member) => (
            <button key={member} type="button" className="button primary big" onClick={() => onPick(member)}>
              {member}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

export function App() {
  const household = useHousehold()
  const [stored, setStored] = useState(readStoredMember)
  const [page, setPage] = useState<PageId>(pageFromHash)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  useEffect(() => {
    if (toast === null) return
    const timer = window.setTimeout(() => setToast(null), toast.onAction ? 8000 : 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const members = useMemo(() => household.data?.members ?? [], [household.data])
  const member = resolveMember(stored, members)

  const pick = useCallback((name: string | null) => {
    storeMember(name)
    setStored(Option.fromNullable(name))
  }, [])

  const state = useMemo<AppState | null>(
    () =>
      member === null
        ? null
        : {
            member,
            members,
            generationEnabled: household.data?.recipe_generation_enabled ?? false,
            day: today(),
            switchMember: () => pick(null),
            notify: setToast,
          },
    [member, members, household.data, pick],
  )

  if (household.isPending) return <Loading label="Connexion à Popote…" />
  if (household.error) {
    return (
      <main className="gate">
        <div className="gate-card">
          <h1>Popote est injoignable</h1>
          <ErrorNote error={household.error} />
          <p className="muted">Vérifie que le back-end tourne (scripts\start.ps1) puis recharge la page.</p>
        </div>
      </main>
    )
  }
  if (state === null) return <MemberGate members={members} onPick={pick} />

  return (
    <AppContext.Provider value={state}>
      <div className="app">
        <header className="topbar">
          <span className="brand">Popote</span>
          <button type="button" className="member-chip" onClick={state.switchMember}>
            {state.member} · changer
          </button>
        </header>
        <main className="content">
          {page === "aujourdhui" && <TodayPage />}
          {page === "recettes" && <RecipesPage />}
          {page === "stock" && <StockPage />}
          {page === "courses" && <ShoppingPage />}
        </main>
        <nav className="bottom-nav" aria-label="Navigation">
          {PAGES.map((entry) => (
            <a key={entry.id} href={`#${entry.id}`} className={page === entry.id ? "is-active" : ""}>
              <span aria-hidden="true">{entry.icon}</span>
              {entry.label}
            </a>
          ))}
        </nav>
        {toast && (
          <div className="toast" role="status">
            <span>{toast.message}</span>
            {toast.onAction && (
              <button
                type="button"
                className="link strong"
                onClick={() => {
                  toast.onAction?.()
                  setToast(null)
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </AppContext.Provider>
  )
}
