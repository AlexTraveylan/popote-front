import { type MouseEvent, type PointerEvent, type ReactNode, useRef, useState } from "react"

const REVEAL_WIDTH = 96
const DRAG_THRESHOLD = 8

type Gesture = {
  startX: number
  startY: number
  base: number
  axis: "x" | "y" | null
}

type SwipeToDeleteProps = {
  open: boolean
  label: string
  disabled?: boolean
  className?: string
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  children: ReactNode
}

export function SwipeToDelete({
  open,
  label,
  disabled = false,
  className = "",
  onOpenChange,
  onDelete,
  children,
}: SwipeToDeleteProps) {
  const gesture = useRef<Gesture | null>(null)
  const swallowClick = useRef(false)
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const offset = dragOffset ?? (open ? -REVEAL_WIDTH : 0)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swallowClick.current = false
    gesture.current = { startX: event.clientX, startY: event.clientY, base: offset, axis: null }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (current === null) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (current.axis === null) {
      if (Math.abs(dx) > DRAG_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        current.axis = "x"
        event.currentTarget.setPointerCapture(event.pointerId)
      } else if (Math.abs(dy) > DRAG_THRESHOLD) {
        current.axis = "y"
      }
    }
    if (current.axis === "x") setDragOffset(Math.min(0, Math.max(-REVEAL_WIDTH, current.base + dx)))
  }

  const onPointerEnd = () => {
    const current = gesture.current
    gesture.current = null
    if (current?.axis !== "x" || dragOffset === null) return
    swallowClick.current = true
    onOpenChange(dragOffset < -REVEAL_WIDTH / 2)
    setDragOffset(null)
  }

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!swallowClick.current && !open) return
    event.preventDefault()
    event.stopPropagation()
    if (swallowClick.current) {
      swallowClick.current = false
      return
    }
    onOpenChange(false)
  }

  return (
    <li className="swipe-row">
      <button
        type="button"
        className="swipe-delete"
        aria-label={`Supprimer ${label}`}
        tabIndex={open ? 0 : -1}
        style={{ visibility: offset === 0 ? "hidden" : "visible" }}
        disabled={disabled}
        onClick={onDelete}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z"
            fill="currentColor"
          />
        </svg>
        Supprimer
      </button>
      <div
        className={`swipe-content ${className} ${dragOffset === null ? "is-settled" : ""}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </li>
  )
}
