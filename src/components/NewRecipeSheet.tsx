import { useState } from "react"

import { api } from "../api/client"
import { useApiMutation } from "../api/hooks"
import type { RecipeContent } from "../api/schemas"
import { useApp } from "../state/AppContext"
import { emptyRecipe, type RecipeFormValue } from "../lib/recipeForm"
import { RecipeForm } from "./RecipeForm"
import { Sheet } from "./Sheet"
import { ErrorNote } from "./ui"

type Tab = "chatgpt" | "manual"

export function NewRecipeSheet({ onClose }: { onClose: () => void }) {
  const { member, members, generationEnabled, notify } = useApp()
  const [tab, setTab] = useState<Tab>(generationEnabled ? "chatgpt" : "manual")
  const [request, setRequest] = useState("")
  const [quick, setQuick] = useState(false)
  const [useStock, setUseStock] = useState(true)
  const [draft, setDraft] = useState<RecipeContent | null>(null)

  const generate = useApiMutation(() => api.draftRecipe(request.trim(), member, quick, useStock))
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

  const formInitial: RecipeFormValue = draft
    ? { ...draft, tags: [...draft.tags], cooks: [member], fans: [member] }
    : { ...emptyRecipe(), cooks: [member], fans: [member] }

  return (
    <Sheet title="Nouvelle recette" onClose={onClose}>
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
      {!generationEnabled && (
        <p className="hint">ChatGPT n'est pas configuré : ajoute OPENAI_API_KEY dans le .env du back-end.</p>
      )}

      {tab === "chatgpt" && draft === null && (
        <div className="form">
          <label className="field">
            <span>Ce que tu as envie de manger</span>
            <textarea
              id="draft-request"
              rows={3}
              placeholder="Ex. un plat de saison avec du panais, un dessert sans four, une idée péruvienne pour 6…"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
            />
          </label>
          <label className="check">
            <input type="checkbox" checked={quick} onChange={(event) => setQuick(event.target.checked)} />
            Rapide (moins de 30 min)
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={useStock}
              onChange={(event) => setUseStock(event.target.checked)}
            />
            Utiliser ce qu'il y a dans le frigo
          </label>
          <ErrorNote error={generate.error} />
          <button
            type="button"
            className="button primary"
            disabled={generate.isPending || request.trim().length < 3}
            onClick={() => generate.mutate(undefined, { onSuccess: setDraft })}
          >
            {generate.isPending ? "ChatGPT cherche une idée…" : "Faire apparaître une recette"}
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
