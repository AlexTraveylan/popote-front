import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { api, type PreferenceChange, runApi } from "../api/client"
import { useApiMutation, useAvailability } from "../api/hooks"
import type { Recipe, RecipeContent } from "../api/schemas"
import { formatQuantity, seasonsSummary, TAG_LABELS } from "../lib/labels"
import { type RecipeFormValue } from "../lib/recipeForm"
import { useApp } from "../state/AppContext"
import { RecipeForm } from "./RecipeForm"
import { Sheet } from "./Sheet"
import { AvailabilityBar, Badge, ErrorNote, Loading } from "./ui"
import { useCookToday } from "./useCookToday"

type Mode = "view" | "edit" | "rework"

const STATUS_ICON = { disponible: "✓", bientot_fini: "!", manquant: "✗" } as const

const useRestoreRecipe = () => {
  const queryClient = useQueryClient()
  return (recipe: Recipe, member: string) =>
    void runApi(
      api.createRecipe({
        title: recipe.title,
        summary: recipe.summary,
        servings: recipe.servings,
        prep_minutes: recipe.prep_minutes,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tags: recipe.tags,
        seasons: recipe.seasons,
        cooks: [...recipe.cooks],
        fans: [...recipe.fans],
        source: recipe.source,
      }),
    )
      .then((restored) =>
        Promise.all(
          recipe.dislikes
            .filter((name) => name !== member)
            .map((name) => runApi(api.setPreference(restored.id, name, { dislikes: true }))),
        ),
      )
      .then(() => queryClient.invalidateQueries())
}

export function RecipeSheet({
  recipe,
  manage = false,
  onClose,
}: {
  recipe: Recipe
  manage?: boolean
  onClose: () => void
}) {
  const { member, members, day, generationEnabled, notify } = useApp()
  const [mode, setMode] = useState<Mode>("view")
  const [instruction, setInstruction] = useState("")
  const [draft, setDraft] = useState<RecipeContent | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const availability = useAvailability(recipe.id, day)
  const { cook, pending: cooking, error: cookError } = useCookToday()
  const restore = useRestoreRecipe()

  const preference = useApiMutation((change: PreferenceChange) =>
    api.setPreference(recipe.id, member, change),
  )
  const save = useApiMutation((value: RecipeFormValue) => api.replaceRecipe(recipe.id, value))
  const rework = useApiMutation((text: string) => api.draftRework(recipe.id, text, member))
  const remove = useApiMutation(() => api.deleteRecipe(recipe.id))

  const setPreference = (change: PreferenceChange) =>
    preference.mutate(change, {
      onSuccess: (outcome) => {
        if (!outcome.deleted) return
        onClose()
        notify({
          message: `Personne n'aime ${recipe.title} : recette supprimée.`,
          actionLabel: "Annuler",
          onAction: () => restore(outcome.recipe, member),
        })
      },
    })

  const submitEdit = (value: RecipeFormValue) =>
    save.mutate(value, {
      onSuccess: () => {
        notify({ message: "Recette mise à jour." })
        setMode("view")
        setDraft(null)
      },
    })

  if (mode === "edit" || (mode === "rework" && draft !== null)) {
    const base = draft ?? recipe
    return (
      <Sheet title={draft ? "Proposition de ChatGPT" : "Modifier la recette"} onClose={onClose}>
        {draft && <p className="hint">Relis et ajuste avant de remplacer la recette actuelle.</p>}
        <ErrorNote error={save.error} />
        <RecipeForm
          initial={{
            ...base,
            tags: [...base.tags],
            seasons: [...base.seasons],
            cooks: [...recipe.cooks],
            fans: [...recipe.fans],
          }}
          members={members}
          showMembers={false}
          submitLabel={draft ? "Remplacer la recette" : "Enregistrer"}
          pending={save.isPending}
          onSubmit={submitEdit}
        />
      </Sheet>
    )
  }

  const likes = recipe.fans.includes(member)
  const dislikes = recipe.dislikes.includes(member)

  return (
    <Sheet title={recipe.title} onClose={onClose}>
      {recipe.summary && <p className="lead">{recipe.summary}</p>}
      <div className="badges">
        <Badge tone={recipe.is_quick ? "good" : "neutral"}>{recipe.prep_minutes} min</Badge>
        <Badge>{recipe.servings} portions</Badge>
        {recipe.tags.map((tag) => (
          <Badge key={tag} tone={tag === "peruvien" ? "aji" : "neutral"}>
            {TAG_LABELS[tag]}
          </Badge>
        ))}
        <Badge>{seasonsSummary(recipe.seasons)}</Badge>
      </div>

      <button
        type="button"
        className="button primary big"
        disabled={cooking}
        onClick={() => cook(recipe, onClose)}
      >
        {cooking ? "Mise à jour du stock…" : "J'ai cuisiné ça aujourd'hui"}
      </button>
      <ErrorNote error={cookError ?? preference.error} />

      <div className="toggle-row">
        <button
          type="button"
          className={`toggle ${likes ? "is-on" : ""}`}
          aria-pressed={likes}
          disabled={preference.isPending}
          onClick={() => setPreference({ likes: !likes })}
        >
          {likes ? "♥ J'aime" : "♡ J'aime"}
        </button>
        <button
          type="button"
          className={`toggle ${dislikes ? "is-on is-dislike" : ""}`}
          aria-pressed={dislikes}
          disabled={preference.isPending}
          onClick={() => setPreference({ dislikes: !dislikes })}
        >
          👎 J'aime pas
        </button>
      </div>
      <p className="hint">
        Aime : {recipe.fans.join(", ") || "personne"} · N'aime pas :{" "}
        {recipe.dislikes.join(", ") || "personne"}. Si tout le monde n'aime pas, la recette est supprimée.
      </p>

      <section className="block">
        <h3>Ingrédients</h3>
        {availability.isPending ? (
          <Loading />
        ) : (
          availability.data && <AvailabilityBar ratio={availability.data.ratio} />
        )}
        <ul className="ingredients">
          {recipe.ingredients.map((ingredient, index) => {
            const check = availability.data?.checks[index]
            const status = check?.status ?? "disponible"
            return (
              <li key={`${ingredient.name}-${index}`} className={`status-${status}`}>
                <span className="status-icon" aria-hidden="true">
                  {STATUS_ICON[status]}
                </span>
                <span>
                  {ingredient.name}
                  {ingredient.optional && <em className="muted"> (facultatif)</em>}
                  {check?.expiring_soon && <Badge tone="warn">à finir vite</Badge>}
                </span>
                <span className="qty">{formatQuantity(ingredient.quantity, ingredient.unit)}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="block">
        <h3>Étapes</h3>
        <ol className="steps">
          {recipe.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>

      {manage && mode === "rework" && (
        <section className="block inset">
          <h3>Retoucher avec ChatGPT</h3>
          <textarea
            id="rework-instruction"
            rows={3}
            placeholder="Ex. version sans lactose, plus rapide, avec du potimarron…"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />
          <ErrorNote error={rework.error} />
          <button
            type="button"
            className="button primary"
            disabled={rework.isPending || instruction.trim().length < 3}
            onClick={() => rework.mutate(instruction.trim(), { onSuccess: setDraft })}
          >
            {rework.isPending ? "ChatGPT réfléchit…" : "Proposer une version"}
          </button>
        </section>
      )}

      {manage && (
        <div className="actions">
          <button type="button" className="button" onClick={() => setMode("edit")}>
            Modifier
          </button>
          {generationEnabled && (
            <button
              type="button"
              className="button"
              onClick={() => setMode(mode === "rework" ? "view" : "rework")}
            >
              Retoucher avec ChatGPT
            </button>
          )}
          {confirmDelete ? (
            <button
              type="button"
              className="button danger"
              onClick={() =>
                remove.mutate(undefined, {
                  onSuccess: () => {
                    notify({ message: "Recette supprimée." })
                    onClose()
                  },
                })
              }
            >
              Confirmer la suppression
            </button>
          ) : (
            <button type="button" className="button ghost" onClick={() => setConfirmDelete(true)}>
              Supprimer
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}
