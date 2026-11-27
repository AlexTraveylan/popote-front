import { useQueryClient } from "@tanstack/react-query"

import { api, runApi } from "../api/client"
import { useApiMutation } from "../api/hooks"
import type { CookLog, Recipe } from "../api/schemas"
import { formatQuantity } from "../lib/labels"
import { useApp } from "../state/AppContext"

const consumptionSummary = (log: CookLog): string => {
  const used = log.consumed.map((line) => `${line.name} −${formatQuantity(line.quantity, line.unit)}`)
  return used.length === 0 ? "Rien à décompter du stock." : `Stock : ${used.join(", ")}.`
}

export const useCookToday = () => {
  const { member, day, notify } = useApp()
  const queryClient = useQueryClient()
  const mutation = useApiMutation((recipe: Recipe) => api.cook(recipe.id, member, recipe.servings, day))

  const cook = (recipe: Recipe, onDone?: () => void) =>
    mutation.mutate(recipe, {
      onSuccess: (log) => {
        onDone?.()
        notify({
          message: `${recipe.title} cuisiné. ${consumptionSummary(log)}`,
          actionLabel: "Annuler",
          onAction: () => void runApi(api.undoCook(log.id)).then(() => queryClient.invalidateQueries()),
        })
      },
    })

  return { cook, pending: mutation.isPending, error: mutation.error }
}
