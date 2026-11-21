import { useState } from "react"

import { api } from "../api/client"
import { useApiMutation, useAvailability } from "../api/hooks"
import type { MealSlot, Recipe, RecipeContent } from "../api/schemas"
import { addDays } from "../lib/dates"
import { formatQuantity, MEAL_SLOTS, SLOT_LABELS, TAG_LABELS } from "../lib/labels"
import { useApp } from "../state/AppContext"
import { CookSheet } from "./CookSheet"
import { type RecipeFormValue } from "../lib/recipeForm"
import { RecipeForm } from "./RecipeForm"
import { Sheet } from "./Sheet"
import { AvailabilityBar, Badge, ErrorNote, Loading } from "./ui"

type Mode = "view" | "edit" | "rework" | "plan" | "cook"

const STATUS_ICON = { disponible: "✓", bientot_fini: "!", manquant: "✗" } as const

export function RecipeSheet({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { member, members, day, generationEnabled, notify } = useApp()
  const [mode, setMode] = useState<Mode>("view")
  const [instruction, setInstruction] = useState("")
  const [draft, setDraft] = useState<RecipeContent | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [planDay, setPlanDay] = useState(day)
  const [planSlot, setPlanSlot] = useState<MealSlot>("soir")
  const availability = useAvailability(recipe.id, day)

  const preference = useApiMutation((change: { can_cook?: boolean; likes?: boolean }) =>
    api.setPreference(recipe.id, member, change),
  )
  const save = useApiMutation((value: RecipeFormValue) => api.replaceRecipe(recipe.id, value))
  const saveMembers = useApiMutation((value: RecipeFormValue) =>
    api.setRecipeMembers(recipe.id, value.cooks, value.fans),
  )
  const rework = useApiMutation((text: string) => api.draftRework(recipe.id, text, member))
  const remove = useApiMutation(() => api.deleteRecipe(recipe.id))
  const plan = useApiMutation(() => api.planMeal(planDay, planSlot, recipe.id, member))

  if (mode === "cook") return <CookSheet recipe={recipe} onClose={onClose} />

  const submitEdit = (value: RecipeFormValue) =>
    save.mutate(value, {
      onSuccess: () =>
        saveMembers.mutate(value, {
          onSuccess: () => {
            notify({ message: "Recette mise à jour." })
            setMode("view")
            setDraft(null)
          },
        }),
    })

  if (mode === "edit" || (mode === "rework" && draft !== null)) {
    const base = draft ?? recipe
    return (
      <Sheet title={draft ? "Proposition de ChatGPT" : "Modifier la recette"} onClose={onClose}>
        {draft && <p className="hint">Relis et ajuste avant de remplacer la recette actuelle.</p>}
        <ErrorNote error={save.error ?? saveMembers.error} />
        <RecipeForm
          initial={{ ...base, tags: [...base.tags], cooks: [...recipe.cooks], fans: [...recipe.fans] }}
          members={members}
          submitLabel={draft ? "Remplacer la recette" : "Enregistrer"}
          pending={save.isPending || saveMembers.isPending}
          onSubmit={submitEdit}
        />
      </Sheet>
    )
  }

  const canCook = recipe.cooks.includes(member)
  const likes = recipe.fans.includes(member)

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
      </div>

      <div className="toggle-row">
        <button
          type="button"
          className={`toggle ${likes ? "is-on" : ""}`}
          aria-pressed={likes}
          onClick={() => preference.mutate({ likes: !likes })}
        >
          {likes ? "♥ J'aime" : "♡ J'aime"}
        </button>
        <button
          type="button"
          className={`toggle ${canCook ? "is-on" : ""}`}
          aria-pressed={canCook}
          onClick={() => preference.mutate({ can_cook: !canCook })}
        >
          {canCook ? "✓ Je sais la faire" : "Je sais la faire"}
        </button>
      </div>
      <p className="hint">
        Sait la faire : {recipe.cooks.join(", ") || "personne"} · Aime :{" "}
        {recipe.fans.join(", ") || "personne"}
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

      {mode === "plan" && (
        <section className="block inset">
          <h3>Prévoir ce plat</h3>
          <div className="field-row">
            <label className="field">
              <span>Jour</span>
              <input
                id="plan-day"
                type="date"
                value={planDay}
                min={day}
                max={addDays(day, 30)}
                onChange={(event) => setPlanDay(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Repas</span>
              <select
                id="plan-slot"
                value={planSlot}
                onChange={(event) => setPlanSlot(event.target.value as MealSlot)}
              >
                {MEAL_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {SLOT_LABELS[slot]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ErrorNote error={plan.error} />
          <button
            type="button"
            className="button primary"
            disabled={plan.isPending}
            onClick={() =>
              plan.mutate(undefined, {
                onSuccess: () => {
                  notify({ message: `${recipe.title} prévu.` })
                  setMode("view")
                },
              })
            }
          >
            Ajouter au planning
          </button>
        </section>
      )}

      {mode === "rework" && (
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

      <div className="actions">
        <button type="button" className="button primary" onClick={() => setMode("cook")}>
          J'ai cuisiné
        </button>
        <button type="button" className="button" onClick={() => setMode(mode === "plan" ? "view" : "plan")}>
          Prévoir
        </button>
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
    </Sheet>
  )
}
