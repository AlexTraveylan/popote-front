import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { api, runApi } from "../api/client"
import { useApiMutation } from "../api/hooks"
import type { CookLog, Recipe } from "../api/schemas"
import { formatQuantity } from "../lib/labels"
import { useApp } from "../state/AppContext"
import { Sheet } from "./Sheet"
import { ErrorNote } from "./ui"

const consumptionSummary = (log: CookLog): string => {
  const used = log.consumed.map((line) => `${line.name} −${formatQuantity(line.quantity, line.unit)}`)
  if (used.length === 0) return "Rien à décompter du stock."
  return `Stock mis à jour : ${used.join(", ")}`
}

export function CookSheet({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { member, members, day, notify } = useApp()
  const [cook, setCook] = useState(member)
  const [servings, setServings] = useState(recipe.servings)
  const cookMutation = useApiMutation((input: { cook: string; servings: number }) =>
    api.cook(recipe.id, input.cook, input.servings, day),
  )
  const queryClient = useQueryClient()

  const confirm = () =>
    cookMutation.mutate(
      { cook, servings },
      {
        onSuccess: (log) => {
          onClose()
          notify({
            message: `${recipe.title} cuisiné. ${consumptionSummary(log)}`,
            actionLabel: "Annuler",
            onAction: () => void runApi(api.undoCook(log.id)).then(() => queryClient.invalidateQueries()),
          })
        },
      },
    )

  return (
    <Sheet title="J'ai cuisiné" onClose={onClose}>
      <p className="lead">{recipe.title}</p>
      <div className="field">
        <span>Qui a cuisiné ?</span>
        <div className="chips">
          {members.map((name) => (
            <button
              key={name}
              type="button"
              className={`chip ${cook === name ? "is-active" : ""}`}
              aria-pressed={cook === name}
              onClick={() => setCook(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Portions</span>
        <div className="stepper">
          <button
            type="button"
            className="icon-button"
            onClick={() => setServings((value) => Math.max(1, value - 1))}
          >
            −
          </button>
          <output>{servings}</output>
          <button type="button" className="icon-button" onClick={() => setServings((value) => value + 1)}>
            +
          </button>
        </div>
      </div>
      <p className="hint">
        Les quantités de la recette sont retirées du stock. Tu pourras annuler juste après.
      </p>
      <ErrorNote error={cookMutation.error} />
      <button type="button" className="button primary" disabled={cookMutation.isPending} onClick={confirm}>
        {cookMutation.isPending ? "Mise à jour du stock…" : "Valider et mettre à jour le stock"}
      </button>
    </Sheet>
  )
}
