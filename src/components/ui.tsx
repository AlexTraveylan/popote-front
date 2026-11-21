import type { ReactNode } from "react"

import type { ApiError } from "../api/client"

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`chip ${active ? "is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function Badge({ tone = "neutral", children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge tone-${tone}`}>{children}</span>
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return <p className="muted">{label}</p>
}

export function ErrorNote({ error }: { error: ApiError | Error | null }) {
  if (error === null) return null
  return <p className="error-note">{error.message}</p>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function AvailabilityBar({ ratio }: { ratio: number }) {
  const percent = Math.round(ratio * 100)
  const tone = percent === 100 ? "good" : percent >= 60 ? "warn" : "bad"
  return (
    <div className="meter" role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <span className={`meter-fill tone-${tone}`} style={{ width: `${percent}%` }} />
    </div>
  )
}
