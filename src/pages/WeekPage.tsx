import { useMemo, useState } from "react"

import { api } from "../api/client"
import { useApiMutation, usePlan, useRecipes, useWeekLogs } from "../api/hooks"
import type { MealSlot, PlannedMeal } from "../api/schemas"
import { Empty, ErrorNote, Loading } from "../components/ui"
import { addDays, formatShortDay, today } from "../lib/dates"
import { formatQuantity, MEAL_SLOTS, SLOT_LABELS } from "../lib/labels"
import { useApp } from "../state/AppContext"

const PLAN_DAYS = 7

function PlanForm({ planOn, onDone }: { planOn: string; onDone: () => void }) {
  const { member, members } = useApp()
  const recipes = useRecipes()
  const [recipeId, setRecipeId] = useState("")
  const [slot, setSlot] = useState<MealSlot>("soir")
  const [cook, setCook] = useState(member)
  const plan = useApiMutation(() => api.planMeal(planOn, slot, recipeId, cook))

  return (
    <div className="plan-form">
      <select
        id={`plan-recipe-${planOn}`}
        value={recipeId}
        onChange={(event) => setRecipeId(event.target.value)}
      >
        <option value="">Choisir une recette…</option>
        {(recipes.data ?? []).map((recipe) => (
          <option key={recipe.id} value={recipe.id}>
            {recipe.title}
          </option>
        ))}
      </select>
      <select
        id={`plan-slot-${planOn}`}
        value={slot}
        onChange={(event) => setSlot(event.target.value as MealSlot)}
      >
        {MEAL_SLOTS.map((current) => (
          <option key={current} value={current}>
            {SLOT_LABELS[current]}
          </option>
        ))}
      </select>
      <select id={`plan-cook-${planOn}`} value={cook} onChange={(event) => setCook(event.target.value)}>
        {members.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <ErrorNote error={plan.error} />
      <button
        type="button"
        className="button primary small"
        disabled={!recipeId || plan.isPending}
        onClick={() => plan.mutate(undefined, { onSuccess: onDone })}
      >
        Prévoir
      </button>
    </div>
  )
}

export function WeekPage() {
  const { day } = useApp()
  const start = today()
  const end = addDays(start, PLAN_DAYS - 1)
  const logs = useWeekLogs(day)
  const plan = usePlan(start, end)
  const recipes = useRecipes()
  const [planningDay, setPlanningDay] = useState<string | null>(null)
  const undo = useApiMutation((logId: string) => api.undoCook(logId))
  const unplan = useApiMutation((mealId: string) => api.removePlannedMeal(mealId))

  const titles = useMemo(
    () => new Map((recipes.data ?? []).map((recipe) => [recipe.id, recipe.title])),
    [recipes.data],
  )
  const planByDay = useMemo(() => {
    const grouped = new Map<string, PlannedMeal[]>()
    for (const meal of plan.data ?? [])
      grouped.set(meal.planned_on, [...(grouped.get(meal.planned_on) ?? []), meal])
    return grouped
  }, [plan.data])

  return (
    <div className="page">
      <header className="page-head">
        <h1>Semaine</h1>
      </header>

      <section className="block">
        <h2>Cuisiné cette semaine</h2>
        <p className="hint">
          Ce qui est coché ici est transmis à Claude pour les courses : il apprend ce que vous mangez
          vraiment.
        </p>
        <ErrorNote error={logs.error ?? undo.error} />
        {logs.isPending && <Loading />}
        {logs.data && logs.data.length === 0 && <Empty>Rien de coché pour l'instant cette semaine.</Empty>}
        <ul className="log-list">
          {logs.data?.map((log) => (
            <li key={log.id}>
              <div>
                <strong>{log.recipe_title}</strong>
                <span className="muted">
                  {" "}
                  · {formatShortDay(log.cooked_on)} · {log.cooked_by} · {log.servings} portions
                </span>
                {log.consumed.length > 0 && (
                  <p className="small muted">
                    {log.consumed
                      .map((line) => `${line.name} −${formatQuantity(line.quantity, line.unit)}`)
                      .join(", ")}
                  </p>
                )}
                {log.missing.length > 0 && (
                  <p className="small muted">Pas en stock : {log.missing.join(", ")}</p>
                )}
              </div>
              <button type="button" className="button ghost small" onClick={() => undo.mutate(log.id)}>
                Annuler
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <h2>Planning des 7 prochains jours</h2>
        <ErrorNote error={plan.error ?? unplan.error} />
        <div className="plan-days">
          {Array.from({ length: PLAN_DAYS }, (_, offset) => addDays(start, offset)).map((current) => (
            <div className="plan-day" key={current}>
              <div className="plan-day-head">
                <strong>{formatShortDay(current)}</strong>
                <button
                  type="button"
                  className="link"
                  onClick={() => setPlanningDay(planningDay === current ? null : current)}
                >
                  {planningDay === current ? "Fermer" : "+ Prévoir"}
                </button>
              </div>
              {(planByDay.get(current) ?? []).map((meal) => (
                <div className="planned" key={meal.id}>
                  <span className="slot">{SLOT_LABELS[meal.slot]}</span>
                  <span>{titles.get(meal.recipe_id) ?? "Recette supprimée"}</span>
                  {meal.cook && <span className="muted">{meal.cook}</span>}
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Retirer du planning"
                    onClick={() => unplan.mutate(meal.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {planningDay === current && <PlanForm planOn={current} onDone={() => setPlanningDay(null)} />}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
