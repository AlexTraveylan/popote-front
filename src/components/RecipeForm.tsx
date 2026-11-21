import { type FormEvent, useState } from "react"

import type { RecipeIngredient, RecipeTag } from "../api/schemas"
import { RECIPE_TAGS, TAG_LABELS } from "../lib/labels"
import type { RecipeFormValue } from "../lib/recipeForm"
import { Chip } from "./ui"

type IngredientRow = { name: string; quantity: string; unit: string; optional: boolean }

const toRow = (ingredient: RecipeIngredient): IngredientRow => ({
  name: ingredient.name,
  quantity: ingredient.quantity === null ? "" : String(ingredient.quantity),
  unit: ingredient.unit ?? "",
  optional: ingredient.optional,
})

const toIngredient = (row: IngredientRow): RecipeIngredient => {
  const quantity = Number.parseFloat(row.quantity.replace(",", "."))
  return {
    name: row.name.trim(),
    quantity: Number.isFinite(quantity) ? quantity : null,
    unit: row.unit.trim() || null,
    optional: row.optional,
  }
}

type RecipeFormProps = {
  initial: RecipeFormValue
  members: readonly string[]
  submitLabel: string
  pending: boolean
  showMembers?: boolean
  onSubmit: (value: RecipeFormValue) => void
}

const toggle = <T,>(values: readonly T[], value: T): T[] =>
  values.includes(value) ? values.filter((current) => current !== value) : [...values, value]

export function RecipeForm({
  initial,
  members,
  submitLabel,
  pending,
  showMembers = true,
  onSubmit,
}: RecipeFormProps) {
  const [title, setTitle] = useState(initial.title)
  const [summary, setSummary] = useState(initial.summary)
  const [servings, setServings] = useState(String(initial.servings))
  const [minutes, setMinutes] = useState(String(initial.prep_minutes))
  const [rows, setRows] = useState<IngredientRow[]>(
    initial.ingredients.length
      ? initial.ingredients.map(toRow)
      : [{ name: "", quantity: "", unit: "", optional: false }],
  )
  const [steps, setSteps] = useState(initial.steps.join("\n"))
  const [tags, setTags] = useState<RecipeTag[]>([...initial.tags])
  const [cooks, setCooks] = useState<string[]>([...initial.cooks])
  const [fans, setFans] = useState<string[]>([...initial.fans])

  const updateRow = (index: number, change: Partial<IngredientRow>) =>
    setRows((current) => current.map((row, position) => (position === index ? { ...row, ...change } : row)))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({
      title: title.trim(),
      summary: summary.trim(),
      servings: Math.max(1, Number.parseInt(servings, 10) || 4),
      prep_minutes: Math.max(1, Number.parseInt(minutes, 10) || 30),
      ingredients: rows.filter((row) => row.name.trim()).map(toIngredient),
      steps: steps
        .split("\n")
        .map((step) => step.trim())
        .filter(Boolean),
      tags,
      cooks,
      fans,
    })
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Nom de la recette</span>
        <input id="recipe-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="field">
        <span>En une phrase</span>
        <input id="recipe-summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Temps total (min)</span>
          <input
            id="recipe-minutes"
            inputMode="numeric"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Portions</span>
          <input
            id="recipe-servings"
            inputMode="numeric"
            value={servings}
            onChange={(event) => setServings(event.target.value)}
          />
        </label>
      </div>

      <fieldset className="field">
        <legend>Ingrédients</legend>
        <p className="hint">Noms simples (« pommes de terre », « crème fraîche ») pour retrouver le stock.</p>
        <div className="ingredient-rows">
          {rows.map((row, index) => (
            <div className="ingredient-row" key={index}>
              <input
                aria-label="Ingrédient"
                placeholder="Ingrédient"
                value={row.name}
                onChange={(event) => updateRow(index, { name: event.target.value })}
              />
              <input
                aria-label="Quantité"
                placeholder="Qté"
                inputMode="decimal"
                value={row.quantity}
                onChange={(event) => updateRow(index, { quantity: event.target.value })}
              />
              <input
                aria-label="Unité"
                placeholder="g, cl, piece…"
                value={row.unit}
                onChange={(event) => updateRow(index, { unit: event.target.value })}
              />
              <label className="check small">
                <input
                  type="checkbox"
                  checked={row.optional}
                  onChange={(event) => updateRow(index, { optional: event.target.checked })}
                />
                option
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label="Retirer l'ingrédient"
                onClick={() => setRows((current) => current.filter((_, position) => position !== index))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="button ghost small"
          onClick={() =>
            setRows((current) => [...current, { name: "", quantity: "", unit: "", optional: false }])
          }
        >
          + Ingrédient
        </button>
      </fieldset>

      <label className="field">
        <span>Étapes (une par ligne)</span>
        <textarea
          id="recipe-steps"
          rows={6}
          value={steps}
          onChange={(event) => setSteps(event.target.value)}
        />
      </label>

      <fieldset className="field">
        <legend>Tags</legend>
        <div className="chips">
          {RECIPE_TAGS.map((tag) => (
            <Chip
              key={tag}
              active={tags.includes(tag)}
              onClick={() => setTags((current) => toggle(current, tag))}
            >
              {TAG_LABELS[tag]}
            </Chip>
          ))}
        </div>
      </fieldset>

      {showMembers && (
        <fieldset className="field">
          <legend>Pour qui ?</legend>
          <div className="member-grid">
            {members.map((member) => (
              <div key={member} className="member-line">
                <strong>{member}</strong>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={cooks.includes(member)}
                    onChange={() => setCooks((current) => toggle(current, member))}
                  />
                  sait la faire
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={fans.includes(member)}
                    onChange={() => setFans((current) => toggle(current, member))}
                  />
                  aime
                </label>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <button type="submit" className="button primary" disabled={pending}>
        {pending ? "Enregistrement…" : submitLabel}
      </button>
    </form>
  )
}
