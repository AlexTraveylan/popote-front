import { useMemo, useState } from "react"

import { useRecipes, useSuggestions } from "../api/hooks"
import type { RecipeTag, Season } from "../api/schemas"
import { NewRecipeSheet } from "../components/NewRecipeSheet"
import { RecipeCard } from "../components/RecipeCard"
import { RecipeSheet } from "../components/RecipeSheet"
import { Chip, Empty, ErrorNote, Loading } from "../components/ui"
import { useCookToday } from "../components/useCookToday"
import { seasonLabel, SEASONS, TAG_LABELS } from "../lib/labels"
import { useApp } from "../state/AppContext"

const FOCUS_TAGS: RecipeTag[] = ["poisson", "vegetarien", "peruvien", "mijote", "dessert"]
const ALL_RECIPES = 100

const cookableLabel = (count: number): string => {
  if (count === 0) return "Aucune recette complète avec ce qu'il y a à la maison"
  if (count === 1) return "1 recette possible avec ce qu'il y a à la maison"
  return `${count} recettes possibles avec ce qu'il y a à la maison`
}

export function TodayPage() {
  const { member, day } = useApp()
  const [complete, setComplete] = useState(true)
  const [quick, setQuick] = useState(false)
  const [liked, setLiked] = useState(false)
  const [tag, setTag] = useState<RecipeTag | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
  const [openedId, setOpenedId] = useState<string | null>(null)
  const [inventing, setInventing] = useState(false)
  const { cook, pending } = useCookToday()

  const everything = useSuggestions({ on: day, member, limit: ALL_RECIPES })
  const filtered = useSuggestions({ on: day, member, quick, liked, tag, season, limit: ALL_RECIPES })
  const recipes = useRecipes()

  const cookableCount = everything.data?.filter((suggestion) => suggestion.availability.cookable).length
  const visible = useMemo(
    () => (filtered.data ?? []).filter((suggestion) => !complete || suggestion.availability.cookable),
    [filtered.data, complete],
  )
  const opened = recipes.data?.find((recipe) => recipe.id === openedId)

  return (
    <div className="page">
      <header className="page-head">
        <h1>On mange quoi ?</h1>
      </header>

      {cookableCount !== undefined && (
        <button
          type="button"
          className={`counter ${cookableCount > 0 ? "is-good" : ""}`}
          onClick={() => setComplete(true)}
        >
          <strong>{cookableCount}</strong>
          <span>{cookableLabel(cookableCount)}</span>
        </button>
      )}

      <button type="button" className="button magic" onClick={() => setInventing(true)}>
        ✨ Une idée de ChatGPT avec ce qu'on a
      </button>

      <div className="chips scroll-x">
        <Chip active={complete} onClick={() => setComplete(!complete)}>
          J'ai tout
        </Chip>
        <Chip active={liked} onClick={() => setLiked(!liked)}>
          ♥ J'aime
        </Chip>
        <Chip active={quick} onClick={() => setQuick(!quick)}>
          Rapide
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

      <ErrorNote error={filtered.error ?? everything.error} />
      {filtered.isPending && <Loading />}
      {filtered.data && visible.length === 0 && (
        <Empty>
          {complete
            ? "Rien de complet avec ces filtres. Enlève « J'ai tout » pour voir ce qu'il manque, ou demande une idée à ChatGPT."
            : "Aucune recette ne correspond à ces filtres."}
        </Empty>
      )}
      <div className="stack">
        {visible.map((suggestion) => (
          <RecipeCard
            key={suggestion.recipe.id}
            recipe={suggestion.recipe}
            member={member}
            availability={suggestion.availability}
            reasons={suggestion.reasons}
            cooking={pending}
            onOpen={() => setOpenedId(suggestion.recipe.id)}
            onCook={() => cook(suggestion.recipe)}
          />
        ))}
      </div>

      {opened && <RecipeSheet key={opened.id} recipe={opened} onClose={() => setOpenedId(null)} />}
      {inventing && <NewRecipeSheet magic onClose={() => setInventing(false)} />}
    </div>
  )
}
