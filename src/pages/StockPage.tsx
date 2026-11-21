import { type FormEvent, useMemo, useState } from "react"

import { api, type NewStockItem, type StockPatch } from "../api/client"
import { useApiMutation, useStock } from "../api/hooks"
import type { ShoppingChannel, StockCategory, StockItem, StockKind } from "../api/schemas"
import { Sheet } from "../components/Sheet"
import { SwipeToDelete } from "../components/SwipeToDelete"
import { Badge, Chip, Empty, ErrorNote, Loading } from "../components/ui"
import { daysBetween, expiryLabel } from "../lib/dates"
import {
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  DEFAULT_CATEGORY,
  formatQuantity,
  KIND_HINTS,
  KIND_LABELS,
  STOCK_CATEGORIES,
  STOCK_KINDS,
} from "../lib/labels"
import { searchKey } from "../lib/search"
import { useApp } from "../state/AppContext"

const STEP_BY_UNIT: Record<string, number> = { g: 50, ml: 50, cl: 5, kg: 0.25, l: 0.25 }

const stepFor = (unit: string | null): number => (unit ? (STEP_BY_UNIT[unit] ?? 1) : 1)

const restorable = (item: StockItem): NewStockItem => ({
  name: item.name,
  kind: item.kind,
  category: item.category,
  channel: item.channel,
  quantity: item.quantity,
  unit: item.unit,
  expires_on: item.expires_on,
  running_low: item.running_low,
})

function StockRow({
  item,
  open,
  onOpenChange,
  onEdit,
}: {
  item: StockItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}) {
  const { day, notify } = useApp()
  const update = useApiMutation((patch: StockPatch) => api.updateStockItem(item.id, patch))
  const runningLow = useApiMutation((value: boolean) => api.setRunningLow(item.id, value))
  const remove = useApiMutation(() => api.deleteStockItem(item.id))
  const restore = useApiMutation(() => api.addStockItem(restorable(item)))
  const expiringIn = item.expires_on ? daysBetween(day, item.expires_on) : null
  const step = stepFor(item.unit)

  const deleteItem = () =>
    remove.mutate(undefined, {
      onSuccess: () =>
        notify({
          message: `${item.name} supprimé du stock.`,
          actionLabel: "Annuler",
          onAction: () => restore.mutate(),
        }),
    })

  return (
    <SwipeToDelete
      open={open}
      label={item.name}
      disabled={remove.isPending}
      className={`stock-row ${item.needs_restock ? "needs" : ""}`}
      onOpenChange={onOpenChange}
      onDelete={deleteItem}
    >
      <button type="button" className="stock-name" onClick={onEdit}>
        <strong>{item.name}</strong>
        {item.expires_on && expiringIn !== null && (
          <Badge tone={expiringIn < 0 ? "bad" : expiringIn <= 3 ? "warn" : "neutral"}>
            {expiryLabel(item.expires_on, day)}
          </Badge>
        )}
        {item.is_out && <Badge tone="bad">épuisé</Badge>}
        {item.channel !== "drive" && <Badge>{CHANNEL_LABELS[item.channel]}</Badge>}
      </button>
      {item.quantity !== null && (
        <div className="stepper compact">
          <button
            type="button"
            className="icon-button"
            aria-label={`Retirer ${item.name}`}
            onClick={() => update.mutate({ quantity: Math.max(0, (item.quantity ?? 0) - step) })}
          >
            −
          </button>
          <output>{formatQuantity(item.quantity, item.unit)}</output>
          <button
            type="button"
            className="icon-button"
            aria-label={`Ajouter ${item.name}`}
            onClick={() => update.mutate({ quantity: (item.quantity ?? 0) + step })}
          >
            +
          </button>
        </div>
      )}
      <label className="check low-check">
        <input
          type="checkbox"
          checked={item.running_low}
          onChange={(event) => runningLow.mutate(event.target.checked)}
        />
        bientôt plus
      </label>
    </SwipeToDelete>
  )
}

type Tracking = "flag" | "quantity"

type Draft = {
  name: string
  kind: StockKind
  category: StockCategory
  channel: ShoppingChannel
  tracking: Tracking
  quantity: string
  unit: string
  expiresOn: string
  runningLow: boolean
}

const defaultTracking = (kind: StockKind): Tracking => (kind === "ingredient" ? "quantity" : "flag")

const draftFrom = (item: StockItem | null, kind: StockKind): Draft => ({
  name: item?.name ?? "",
  kind: item?.kind ?? kind,
  category: item?.category ?? DEFAULT_CATEGORY[kind],
  channel: item?.channel ?? (kind === "fruit" ? "marche" : "drive"),
  tracking: item ? (item.quantity === null ? "flag" : "quantity") : defaultTracking(kind),
  quantity: item?.quantity === null || item?.quantity === undefined ? "" : String(item.quantity),
  unit: item?.unit ?? "",
  expiresOn: item?.expires_on ?? "",
  runningLow: item?.running_low ?? false,
})

function StockItemSheet({
  item,
  kind,
  onClose,
}: {
  item: StockItem | null
  kind: StockKind
  onClose: () => void
}) {
  const { notify } = useApp()
  const [draft, setDraft] = useState<Draft>(draftFrom(item, kind))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (change: Partial<Draft>) => setDraft((current) => ({ ...current, ...change }))

  const save = useApiMutation((value: Draft) => {
    const parsed = Number.parseFloat(value.quantity.replace(",", "."))
    const quantity = value.tracking === "quantity" && Number.isFinite(parsed) ? parsed : null
    const expiresOn = value.tracking === "quantity" ? value.expiresOn : ""
    const common = {
      name: value.name.trim(),
      kind: value.kind,
      category: value.category,
      channel: value.channel,
      running_low: value.runningLow,
    }
    if (item === null) {
      return api.addStockItem({
        ...common,
        quantity,
        unit: quantity === null ? null : value.unit.trim() || null,
        expires_on: expiresOn || null,
      })
    }
    return api.updateStockItem(item.id, {
      ...common,
      unit: value.unit.trim() || undefined,
      ...(quantity === null ? { clear_quantity: true } : { quantity }),
      ...(expiresOn ? { expires_on: expiresOn } : { clear_expiry: true }),
    })
  })
  const remove = useApiMutation(() => api.deleteStockItem(item?.id ?? ""))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate(draft, {
      onSuccess: (saved) => {
        notify({ message: item ? `${saved.name} enregistré.` : `${saved.name} est maintenant suivi.` })
        onClose()
      },
    })
  }

  return (
    <Sheet title={item ? item.name : "Nouvel article à suivre"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {item === null && (
          <p className="hint">
            Pour ajouter quelque chose que le foyer utilise, comme le sel ou la levure. Ce n'est pas un achat
            : rien n'est compté dans les courses.
          </p>
        )}
        <label className="field">
          <span>Nom générique</span>
          <input
            id="stock-name"
            required
            placeholder="Ex. levure boulangère"
            value={draft.name}
            onChange={(event) => set({ name: event.target.value })}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Famille</span>
            <select
              id="stock-kind"
              value={draft.kind}
              onChange={(event) => {
                const next = event.target.value as StockKind
                set({
                  kind: next,
                  channel: next === "fruit" ? "marche" : draft.channel,
                  ...(item === null
                    ? { tracking: defaultTracking(next), category: DEFAULT_CATEGORY[next] }
                    : {}),
                })
              }}
            >
              {STOCK_KINDS.map((current) => (
                <option key={current} value={current}>
                  {KIND_LABELS[current]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Rayon</span>
            <select
              id="stock-category"
              value={draft.category}
              onChange={(event) => set({ category: event.target.value as StockCategory })}
            >
              {STOCK_CATEGORIES.map((current) => (
                <option key={current} value={current}>
                  {CATEGORY_LABELS[current]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Où l'acheter</span>
          <select
            id="stock-channel"
            value={draft.channel}
            onChange={(event) => set({ channel: event.target.value as ShoppingChannel })}
          >
            {(Object.keys(CHANNEL_LABELS) as ShoppingChannel[]).map((current) => (
              <option key={current} value={current}>
                {CHANNEL_LABELS[current]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="field">
          <legend>Comment le suivre ?</legend>
          <div className="chips">
            <Chip active={draft.tracking === "flag"} onClick={() => set({ tracking: "flag" })}>
              Juste « bientôt plus »
            </Chip>
            <Chip active={draft.tracking === "quantity"} onClick={() => set({ tracking: "quantity" })}>
              Avec la quantité
            </Chip>
          </div>
          <p className="hint">
            {draft.tracking === "flag"
              ? "Comme le sel : tu coches « bientôt plus » quand il faut en racheter."
              : "La quantité baisse quand une recette l'utilise et remonte avec les courses."}
          </p>
        </fieldset>

        {draft.tracking === "quantity" && (
          <>
            <div className="field-row">
              <label className="field">
                <span>Quantité à la maison</span>
                <input
                  id="stock-quantity"
                  inputMode="decimal"
                  value={draft.quantity}
                  onChange={(event) => set({ quantity: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Unité</span>
                <input
                  id="stock-unit"
                  placeholder="g, kg, cl, piece…"
                  value={draft.unit}
                  onChange={(event) => set({ unit: event.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span>À consommer avant</span>
              <input
                id="stock-expiry"
                type="date"
                value={draft.expiresOn}
                onChange={(event) => set({ expiresOn: event.target.value })}
              />
            </label>
          </>
        )}

        <label className="check">
          <input
            type="checkbox"
            checked={draft.runningLow}
            onChange={(event) => set({ runningLow: event.target.checked })}
          />
          Bientôt plus : à mettre dans les prochaines courses
        </label>

        <ErrorNote error={save.error ?? remove.error} />
        <button type="submit" className="button primary" disabled={save.isPending}>
          {item ? "Enregistrer" : "Suivre cet article"}
        </button>
        {item &&
          (confirmDelete ? (
            <button
              type="button"
              className="button danger"
              onClick={() => remove.mutate(undefined, { onSuccess: onClose })}
            >
              Confirmer : supprimer {item.name} du stock
            </button>
          ) : (
            <button type="button" className="button ghost" onClick={() => setConfirmDelete(true)}>
              Supprimer du stock
            </button>
          ))}
      </form>
    </Sheet>
  )
}

export function StockPage() {
  const stock = useStock()
  const [kind, setKind] = useState<StockKind>("ingredient")
  const [onlyToBuy, setOnlyToBuy] = useState(false)
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<StockItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [swipedId, setSwipedId] = useState<string | null>(null)

  const counts = useMemo(() => {
    const result = new Map<StockKind, number>()
    for (const item of stock.data ?? []) {
      if (item.needs_restock) result.set(item.kind, (result.get(item.kind) ?? 0) + 1)
    }
    return result
  }, [stock.data])

  const groups = useMemo(() => {
    const needle = searchKey(query)
    const items = (stock.data ?? []).filter(
      (item) =>
        item.kind === kind &&
        (!onlyToBuy || item.needs_restock) &&
        (!needle || searchKey(item.name).includes(needle)),
    )
    const byCategory = new Map<StockCategory, StockItem[]>()
    for (const item of items) byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item])
    return [...byCategory.entries()]
  }, [stock.data, kind, onlyToBuy, query])

  return (
    <div className="page">
      <header className="page-head">
        <h1>Stock</h1>
        <button type="button" className="button primary" onClick={() => setAdding(true)}>
          + Nouvel article
        </button>
      </header>

      <div className="segmented scroll-x" role="tablist">
        {STOCK_KINDS.map((current) => (
          <button
            key={current}
            type="button"
            role="tab"
            aria-selected={kind === current}
            className={kind === current ? "is-active" : ""}
            onClick={() => setKind(current)}
          >
            {KIND_LABELS[current]}
            {(counts.get(current) ?? 0) > 0 && <span className="count">{counts.get(current)}</span>}
          </button>
        ))}
      </div>
      <p className="hint">{KIND_HINTS[kind]} Glisse un article vers la gauche pour le supprimer.</p>

      <div className="toolbar">
        <input
          id="stock-search"
          className="search"
          type="search"
          placeholder="Filtrer"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Chip active={onlyToBuy} onClick={() => setOnlyToBuy(!onlyToBuy)}>
          À racheter
        </Chip>
      </div>

      <ErrorNote error={stock.error} />
      {stock.isPending && <Loading />}
      {stock.data && groups.length === 0 && <Empty>Rien ici pour le moment.</Empty>}
      {groups.map(([category, items]) => (
        <section className="block" key={category}>
          <h2 className="eyebrow">{CATEGORY_LABELS[category]}</h2>
          <ul className="stock-list">
            {items.map((item) => (
              <StockRow
                key={item.id}
                item={item}
                open={swipedId === item.id}
                onOpenChange={(open) => setSwipedId(open ? item.id : null)}
                onEdit={() => setEditing(item)}
              />
            ))}
          </ul>
        </section>
      ))}

      {(adding || editing) && (
        <StockItemSheet
          key={editing?.id ?? "new"}
          item={editing}
          kind={kind}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
