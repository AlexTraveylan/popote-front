import { useMemo, useState } from "react"

import { useRecipes } from "../api/hooks"
import type { Recipe, RecipeTag } from "../api/schemas"
import { NewRecipeSheet } from "../components/NewRecipeSheet"
import { RecipeCard } from "../components/RecipeCard"
import { RecipeSheet } from "../components/RecipeSheet"
import { Chip, Empty, ErrorNote, Loading } from "../components/ui"
import { RECIPE_TAGS, TAG_LABELS } from "../lib/labels"
import { searchKey } from "../lib/search"
import { useApp } from "../state/AppContext"

type Scope = "all" | "mine" | "likes" | "cooks"

export function RecipesPage() {
  const { member } = useApp()
  const recipes = useRecipes()
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<Scope>("all")
  const [quick, setQuick] = useState(false)
  const [tag, setTag] = useState<RecipeTag | null>(null)
  const [openedId, setOpenedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const visible = useMemo(() => {
    const needle = searchKey(query)
    return (recipes.data ?? []).filter((recipe) => {
      if (
        needle &&
        !searchKey(`${recipe.title} ${recipe.ingredients.map((i) => i.name).join(" ")}`).includes(needle)
      )
        return false
      if (scope === "mine" && !recipe.cooks.includes(member) && !recipe.fans.includes(member)) return false
      if (scope === "likes" && !recipe.fans.includes(member)) return false
      if (scope === "cooks" && !recipe.cooks.includes(member)) return false
      if (quick && !recipe.is_quick) return false
      return tag === null || recipe.tags.includes(tag)
    })
  }, [recipes.data, query, scope, quick, tag, member])

  const opened: Recipe | undefined = recipes.data?.find((recipe) => recipe.id === openedId)

  return (
    <div className="page">
      <header className="page-head">
        <h1>Recettes</h1>
        <button type="button" className="button primary" onClick={() => setCreating(true)}>
          + Nouvelle
        </button>
      </header>

      <input
        id="recipe-search"
        className="search"
        type="search"
        placeholder="Chercher une recette ou un ingrédient"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="chips scroll-x">
        <Chip active={scope === "all"} onClick={() => setScope("all")}>
          Toutes
        </Chip>
        <Chip active={scope === "mine"} onClick={() => setScope("mine")}>
          Les miennes
        </Chip>
        <Chip active={scope === "likes"} onClick={() => setScope("likes")}>
          J'aime
        </Chip>
        <Chip active={scope === "cooks"} onClick={() => setScope("cooks")}>
          Je sais faire
        </Chip>
        <Chip active={quick} onClick={() => setQuick(!quick)}>
          Rapide
        </Chip>
      </div>
      <div className="chips scroll-x">
        {RECIPE_TAGS.filter((current) => current !== "rapide").map((current) => (
          <Chip
            key={current}
            active={tag === current}
            onClick={() => setTag(tag === current ? null : current)}
          >
            {TAG_LABELS[current]}
          </Chip>
        ))}
      </div>

      <ErrorNote error={recipes.error} />
      {recipes.isPending && <Loading />}
      {recipes.data && visible.length === 0 && <Empty>Aucune recette trouvée.</Empty>}
      <p className="muted small">
        {visible.length} recette{visible.length > 1 ? "s" : ""}
      </p>
      <div className="stack">
        {visible.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} member={member} onOpen={() => setOpenedId(recipe.id)} />
        ))}
      </div>

      {opened && <RecipeSheet key={opened.id} recipe={opened} onClose={() => setOpenedId(null)} />}
      {creating && <NewRecipeSheet onClose={() => setCreating(false)} />}
    </div>
  )
}
