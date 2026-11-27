import { useState } from "react"

import { api } from "../api/client"
import { useApiMutation } from "../api/hooks"
import type { RecipeContent, Season } from "../api/schemas"
import { seasonOf } from "../lib/dates"
import { seasonLabel, SEASONS } from "../lib/labels"
import { emptyRecipe, type RecipeFormValue } from "../lib/recipeForm"
import { useApp } from "../state/AppContext"
import { RecipeForm } from "./RecipeForm"
import { Sheet } from "./Sheet"
import { Chip, ErrorNote } from "./ui"

type Tab = "chatgpt" | "manual"

export function NewRecipeSheet({ magic = false, onClose }: { magic?: boolean; onClose: () => void }) {
  const { member, members, day, generationEnabled, notify } = useApp()
  const [tab, setTab] = useState<Tab>(magic || generationEnabled ? "chatgpt" : "manual")
  const [request, setRequest] = useState("")
  const [quick, setQuick] = useState(false)
  const [useStock, setUseStock] = useState(true)
  const [stockOnly, setStockOnly] = useState(magic)
  const [season, setSeason] = useState<Season>(seasonOf(day))
  const [draft, setDraft] = useState<RecipeContent | null>(null)

  const generate = useApiMutation(() =>
    api.draftRecipe({
      request: request.trim(),
      member,
      quick,
      useStock: useStock || stockOnly,
      stockOnly,
      season,
    }),
  )
  const create = useApiMutation((value: RecipeFormValue) =>
    api.createRecipe({ ...value, source: draft ? "chatgpt" : "manuel" }),
  )

  const save = (value: RecipeFormValue) =>
    create.mutate(value, {
      onSuccess: (recipe) => {
        notify({ message: `${recipe.title} ajoutée aux recettes.` })
        onClose()
      },
    })

  const owners = magic ? { cooks: [], fans: [] } : { cooks: [member], fans: [member] }
  const formInitial: RecipeFormValue = draft
    ? { ...draft, tags: [...draft.tags], seasons: [...draft.seasons], ...owners }
    : { ...emptyRecipe(), ...owners }

  return (
    <Sheet title={magic ? "✨ Une idée avec ce qu'on a" : "Nouvelle recette"} onClose={onClose}>
      {!magic && (
        <div className="segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "chatgpt"}
            className={tab === "chatgpt" ? "is-active" : ""}
            disabled={!generationEnabled}
            onClick={() => setTab("chatgpt")}
          >
            Avec ChatGPT
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "manual"}
            className={tab === "manual" ? "is-active" : ""}
            onClick={() => setTab("manual")}
          >
            À la main
          </button>
        </div>
      )}
      {!generationEnabled && (
        <p className="hint">ChatGPT n'est pas configuré : ajoute OPENAI_API_KEY dans le .env du back-end.</p>
      )}

      {tab === "chatgpt" && draft === null && (
        <div className="form">
          {magic && (
            <p className="hint">
              ChatGPT regarde le stock et les goûts de chacun, puis propose une recette. Tu peux préciser une
              envie.
            </p>
          )}
          <label className="field">
            <span>{magic ? "Une envie ? (facultatif)" : "Ce que tu as envie de manger"}</span>
            <textarea
              id="draft-request"
              rows={3}
              placeholder="Ex. un plat avec du panais, un dessert sans four, une idée péruvienne pour 6…"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
            />
          </label>
          <fieldset className="field">
            <legend>Pour quelle saison ?</legend>
            <div className="chips">
              {SEASONS.map((current) => (
                <Chip key={current} active={season === current} onClick={() => setSeason(current)}>
                  {seasonLabel(current)}
                </Chip>
              ))}
            </div>
          </fieldset>
          <label className="check">
            <input
              type="checkbox"
              checked={stockOnly}
              onChange={(event) => setStockOnly(event.target.checked)}
            />
            Seulement avec ce qu'il y a (rien à acheter)
          </label>
          {!stockOnly && (
            <label className="check">
              <input
                type="checkbox"
                checked={useStock}
                onChange={(event) => setUseStock(event.target.checked)}
              />
              Utiliser en priorité ce qu'il y a dans le frigo
            </label>
          )}
          <label className="check">
            <input type="checkbox" checked={quick} onChange={(event) => setQuick(event.target.checked)} />
            Rapide (moins de 30 min)
          </label>
          <ErrorNote error={generate.error} />
          <button
            type="button"
            className="button primary"
            disabled={!generationEnabled || generate.isPending}
            onClick={() => generate.mutate(undefined, { onSuccess: setDraft })}
          >
            {generate.isPending ? "ChatGPT cherche une idée…" : "✨ Trouver une recette"}
          </button>
        </div>
      )}

      {(tab === "manual" || draft !== null) && (
        <>
          {draft && (
            <div className="draft-head">
              <p className="hint">Proposition de ChatGPT : relis, ajuste, puis garde-la.</p>
              <button type="button" className="button ghost small" onClick={() => setDraft(null)}>
                Une autre idée
              </button>
            </div>
          )}
          <ErrorNote error={create.error} />
          <RecipeForm
            key={draft?.title ?? "manual"}
            initial={formInitial}
            members={members}
            submitLabel="Garder cette recette"
            pending={create.isPending}
            onSubmit={save}
          />
        </>
      )}
    </Sheet>
  )
}
