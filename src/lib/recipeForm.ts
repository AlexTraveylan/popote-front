import type { RecipeContent } from "../api/schemas"

export type RecipeFormValue = RecipeContent & { cooks: string[]; fans: string[] }

export const emptyRecipe = (): RecipeFormValue => ({
  title: "",
  summary: "",
  servings: 4,
  prep_minutes: 30,
  ingredients: [],
  steps: [],
  tags: [],
  cooks: [],
  fans: [],
})
