import { useMemo, useState } from "react"

import { usePlan, useOverview, useRecipes, useSuggestions } from "../api/hooks"
import type { Recipe, RecipeTag, Season } from "../api/schemas"
import { CookSheet } from "../components/CookSheet"
import { RecipeCard } from "../components/RecipeCard"
import { RecipeSheet } from "../components/RecipeSheet"
import { Chip, Empty, ErrorNote, Loading } from "../components/ui"
import { addDays, expiryLabel, relativeDay, seasonOf, today } from "../lib/dates"
import { formatQuantity, SEASON_OF, seasonLabel, SEASONS, SLOT_LABELS, TAG_LABELS } from "../lib/labels"
import { useApp } from "../state/AppContext"

const FOCUS_TAGS: RecipeTag[] = ["poisson", "vegetarien", "peruvien", "mijote", "dessert"]

export function TodayPage({ goTo }: { goTo: (page: string) => void }) {
  const { member, day, setDay } = useApp()
  const [quick, setQuick] = useState(false)
  const [mine, setMine] = useState(false)
  const [tag, setTag] = useState<RecipeTag | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
  const [openedId, setOpenedId] = useState<string | null>(null)
  const [cooking, setCooking] = useState<Recipe | null>(null)

  const suggestions = useSuggestions({ on: day, member, quick, mine, tag, season, limit: 12 })
  const overview = useOverview(day)
  const plan = usePlan(day, day)
  const recipes = useRecipes()
  const recipesById = useMemo(
    () => new Map((recipes.data ?? []).map((recipe) => [recipe.id, recipe])),
    [recipes.data],
  )

  const opened = openedId === null ? undefined : recipesById.get(openedId)

  const toBuyCount =
    (overview.data?.to_buy_drive.length ?? 0) +
    (overview.data?.to_buy_fresh_market.length ?? 0) +
    (overview.data?.to_buy_other.length ?? 0)

  return (
    <div className="page">
      <header className="day-nav">
        <button
          type="button"
          className="icon-button"
          aria-label="Jour précédent"
          onClick={() => setDay(addDays(day, -1))}
        >
          ‹
        </button>
        <div>
          <h1>{relativeDay(day, today())}</h1>
          {day !== today() && (
            <button type="button" className="link" onClick={() => setDay(today())}>
              Revenir à aujourd'hui
            </button>
          )}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Jour suivant"
          onClick={() => setDay(addDays(day, 1))}
        >
          ›
        </button>
      </header>

      {overview.data && overview.data.expiring_soon.length > 0 && (
        <section className="alert tone-warn">
          <h2>À cuisiner en priorité</h2>
          <ul className="inline-list">
            {overview.data.expiring_soon.map((line) => (
              <li key={line.name}>
                <strong>{line.name}</strong> {formatQuantity(line.quantity, line.unit)}
                {line.expires_on && <span className="muted"> · {expiryLabel(line.expires_on, day)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {toBuyCount > 0 && (
        <button type="button" className="alert tone-info as-button" onClick={() => goTo("courses")}>
          {toBuyCount} article{toBuyCount > 1 ? "s" : ""} à racheter aux prochaines courses →
        </button>
      )}

      {plan.data && plan.data.length > 0 && (
        <section className="block">
          <h2>Prévu</h2>
          <div className="stack">
            {plan.data.map((meal) => {
              const recipe = recipesById.get(meal.recipe_id)
              return (
                <div className="planned" key={meal.id}>
                  <span className="slot">{SLOT_LABELS[meal.slot]}</span>
                  <button
                    type="button"
                    className="link strong"
                    onClick={() => recipe && setOpenedId(recipe.id)}
                  >
                    {recipe?.title ?? "Recette supprimée"}
                  </button>
                  {meal.cook && <span className="muted">par {meal.cook}</span>}
                  {recipe && (
                    <button type="button" className="button small" onClick={() => setCooking(recipe)}>
                      Fait
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="block">
        <div className="section-head">
          <h2>Idées pour {day === today() ? "aujourd'hui" : "ce jour"}</h2>
        </div>
        <div className="chips scroll-x">
          <Chip active={quick} onClick={() => setQuick(!quick)}>
            Rapide
          </Chip>
          <Chip active={mine} onClick={() => setMine(!mine)}>
            Mes recettes
          </Chip>
          {FOCUS_TAGS.map((current) => (
            <Chip
              key={current}
              active={tag === current}
              onClick={() => setTag(tag === current ? null : current)}
            >
              {TAG_LABELS[current]}
            </Chip>
          ))}
        </div>
        <div className="chips scroll-x">
          {SEASONS.map((current) => (
            <Chip
              key={current}
              active={season === current}
              onClick={() => setSeason(season === current ? null : current)}
            >
              {seasonLabel(current)}
            </Chip>
          ))}
        </div>
        {season === null && (
          <p className="hint">
            Les recettes {SEASON_OF[seasonOf(day)]} passent en premier ; choisis une saison pour voir celles
            d'une autre.
          </p>
        )}
        <ErrorNote error={suggestions.error} />
        {suggestions.isPending && <Loading />}
        {suggestions.data && suggestions.data.length === 0 && (
          <Empty>Aucune recette ne correspond à ces filtres.</Empty>
        )}
        <div className="stack">
          {suggestions.data?.map((suggestion) => (
            <RecipeCard
              key={suggestion.recipe.id}
              recipe={suggestion.recipe}
              member={member}
              availability={suggestion.availability}
              reasons={suggestion.reasons}
              onOpen={() => setOpenedId(suggestion.recipe.id)}
              onCook={() => setCooking(suggestion.recipe)}
            />
          ))}
        </div>
      </section>

      {opened && <RecipeSheet key={opened.id} recipe={opened} onClose={() => setOpenedId(null)} />}
      {cooking && <CookSheet recipe={cooking} onClose={() => setCooking(null)} />}
    </div>
  )
}
