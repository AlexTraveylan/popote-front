import { type FormEvent, useState } from "react"

import { api } from "../api/client"
import { useApiMutation, useNotes, useOverview, useStock, useTrips } from "../api/hooks"
import type { ToBuyItem } from "../api/schemas"
import { Empty, ErrorNote, Loading } from "../components/ui"
import { formatShortDay } from "../lib/dates"
import { CHANNEL_LABELS, KIND_LABELS } from "../lib/labels"
import { useApp } from "../state/AppContext"

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })

function ToBuyList({ title, hint, items }: { title: string; hint: string; items: readonly ToBuyItem[] }) {
  const stock = useStock()
  const restocked = useApiMutation((id: string) => api.setRunningLow(id, false))
  const idByName = new Map((stock.data ?? []).map((item) => [item.name, item.id]))
  if (items.length === 0) return null
  return (
    <section className="block">
      <h2>
        {title} <span className="count">{items.length}</span>
      </h2>
      <p className="hint">{hint}</p>
      <ul className="buy-list">
        {items.map((item) => {
          const id = idByName.get(item.name)
          return (
            <li key={item.name}>
              <div>
                <strong>{item.name}</strong>
                <span className="muted">
                  {" "}
                  · {KIND_LABELS[item.kind]} · {item.reason}
                </span>
                {item.preferred_product && <p className="small muted">Habituel : {item.preferred_product}</p>}
              </div>
              {id && (
                <button type="button" className="button ghost small" onClick={() => restocked.mutate(id)}>
                  Racheté
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function NotesBlock() {
  const { member } = useApp()
  const notes = useNotes()
  const [text, setText] = useState("")
  const add = useApiMutation(() => api.addNote(text.trim(), member))
  const remove = useApiMutation((id: string) => api.deleteNote(id))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    add.mutate(undefined, { onSuccess: () => setText("") })
  }

  return (
    <section className="block">
      <h2>Mémoire du foyer</h2>
      <p className="hint">Goûts, habitudes, budget… Claude lit ces notes avant chaque course.</p>
      <form className="inline-form" onSubmit={submit}>
        <input
          id="note-text"
          placeholder="Ex. les enfants adorent le crumble"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button
          type="submit"
          className="button primary small"
          disabled={text.trim().length < 2 || add.isPending}
        >
          Retenir
        </button>
      </form>
      <ErrorNote error={notes.error ?? add.error} />
      <ul className="note-list">
        {notes.data?.map((note) => (
          <li key={note.id}>
            <span>{note.text}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Oublier cette note"
              onClick={() => remove.mutate(note.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ShoppingPage() {
  const { day } = useApp()
  const overview = useOverview(day)
  const trips = useTrips()
  const [openTrip, setOpenTrip] = useState<string | null>(null)
  const mcpUrl = `http://localhost:8000/mcp`

  const nothingToBuy =
    overview.data &&
    overview.data.to_buy_drive.length +
      overview.data.to_buy_fresh_market.length +
      overview.data.to_buy_other.length ===
      0

  return (
    <div className="page">
      <header className="page-head">
        <h1>Courses</h1>
      </header>

      <section className="alert tone-info">
        <h2>Faire les courses avec Claude</h2>
        <p className="small">
          Claude se connecte au serveur MCP de Popote, lit ce qu'il manque, vos habitudes et vos produits
          préférés, puis remplit le panier du drive et enregistre ce qui a été acheté.
        </p>
        <code className="selectable">{mcpUrl}</code>
      </section>

      <ErrorNote error={overview.error} />
      {overview.isPending && <Loading />}
      {nothingToBuy && <Empty>Rien n'est signalé à racheter. Coche « bientôt plus » dans le stock.</Empty>}
      {overview.data && (
        <>
          <ToBuyList
            title={CHANNEL_LABELS.drive}
            hint="Ce que Claude mettra au panier du drive."
            items={overview.data.to_buy_drive}
          />
          <ToBuyList
            title={CHANNEL_LABELS.marche}
            hint="Fruits frais : à acheter au marché, jamais au drive."
            items={overview.data.to_buy_fresh_market}
          />
          <ToBuyList
            title={CHANNEL_LABELS.autre}
            hint="Livré par un autre fournisseur (le café par exemple)."
            items={overview.data.to_buy_other}
          />
        </>
      )}

      <NotesBlock />

      <section className="block">
        <h2>Historique des courses</h2>
        <ErrorNote error={trips.error} />
        {trips.data && trips.data.length === 0 && <Empty>Aucune course enregistrée.</Empty>}
        <ul className="trip-list">
          {trips.data?.map((trip) => (
            <li key={trip.id}>
              <button
                type="button"
                className="trip-head"
                aria-expanded={openTrip === trip.id}
                onClick={() => setOpenTrip(openTrip === trip.id ? null : trip.id)}
              >
                <strong>{formatShortDay(trip.shopped_on)}</strong>
                <span className="muted">{trip.store}</span>
                <span className="muted">{trip.items.length} articles</span>
                <span className="amount">{trip.total === null ? "" : euros.format(trip.total)}</span>
              </button>
              {openTrip === trip.id && (
                <ul className="trip-items">
                  {trip.items.map((item, index) => (
                    <li key={`${item.product_name}-${index}`}>
                      <span>
                        {item.packs > 1 && `${item.packs} × `}
                        {item.product_name}
                      </span>
                      <span className="muted">{item.stock_name}</span>
                      <span className="amount">
                        {item.unit_price === null ? "" : euros.format(item.unit_price * item.packs)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
