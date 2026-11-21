import type { Recipe, RecipeAvailability } from "../api/schemas"
import { TAG_LABELS } from "../lib/labels"
import { AvailabilityBar, Badge } from "./ui"

type RecipeCardProps = {
  recipe: Recipe
  member: string
  availability?: RecipeAvailability
  reasons?: readonly string[]
  onOpen: () => void
  onCook?: () => void
}

export function RecipeCard({ recipe, member, availability, reasons, onOpen, onCook }: RecipeCardProps) {
  const likes = recipe.fans.includes(member)
  const canCook = recipe.cooks.includes(member)
  return (
    <article className="card recipe-card">
      <button type="button" className="card-main" onClick={onOpen}>
        <div className="card-title-row">
          <h3>{recipe.title}</h3>
          <span className={`minutes ${recipe.is_quick ? "is-quick" : ""}`}>{recipe.prep_minutes} min</span>
        </div>
        <div className="badges">
          {likes && <Badge tone="love">♥ {member}</Badge>}
          {canCook && <Badge tone="good">{member} sait faire</Badge>}
          {recipe.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} tone={tag === "peruvien" ? "aji" : "neutral"}>
              {TAG_LABELS[tag]}
            </Badge>
          ))}
        </div>
        {availability && <AvailabilityBar ratio={availability.ratio} />}
        {reasons && reasons.length > 0 && <p className="reasons">{reasons.join(" · ")}</p>}
      </button>
      {onCook && (
        <button type="button" className="button small" onClick={onCook}>
          J'ai cuisiné
        </button>
      )}
    </article>
  )
}
