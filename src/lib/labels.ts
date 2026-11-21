import type { MealSlot, RecipeTag, ShoppingChannel, StockCategory, StockKind } from "../api/schemas"

export const KIND_LABELS: Record<StockKind, string> = {
  ingredient: "Cuisine",
  basique: "Basiques",
  petit_dej_gouter: "Petit-déj & goûters",
  fruit: "Fruits",
  maison: "Maison",
}

export const KIND_HINTS: Record<StockKind, string> = {
  ingredient: "Ce qui sert aux recettes, avec les quantités et les dates.",
  basique: "Sel, huile, épices… Coche « bientôt plus » pour qu'il soit racheté.",
  petit_dej_gouter: "Céréales, biscuits, compotes, yaourts à boire, jus.",
  fruit: "Fruits frais, achetés au marché, jamais au drive.",
  maison: "Papier toilette, dentifrice, pastilles, croquettes…",
}

export const CATEGORY_LABELS: Record<StockCategory, string> = {
  fruits_legumes: "Fruits et légumes",
  viande_poisson: "Viande et poisson",
  charcuterie: "Charcuterie",
  cremerie: "Crèmerie",
  epicerie_salee: "Épicerie salée",
  epicerie_sucree: "Épicerie sucrée",
  surgeles: "Surgelés",
  pain: "Pain",
  boissons: "Boissons",
  hygiene: "Hygiène",
  entretien: "Entretien",
  animaux: "Animaux",
  autre: "Autre",
}

export const CHANNEL_LABELS: Record<ShoppingChannel, string> = {
  drive: "Drive",
  marche: "Marché",
  autre: "Autre fournisseur",
}

export const SLOT_LABELS: Record<MealSlot, string> = {
  petit_dej: "Petit-déj",
  midi: "Midi",
  gouter: "Goûter",
  soir: "Soir",
}

export const TAG_LABELS: Record<RecipeTag, string> = {
  rapide: "Rapide",
  vegetarien: "Végétarien",
  poisson: "Poisson",
  peruvien: "Pérou",
  mijote: "Mijoté",
  leger: "Léger",
  a_congeler: "Se congèle",
  invites: "Invités",
  enfants: "Enfants",
  saison: "Saison",
  dessert: "Dessert",
  petit_dej: "Petit-déj",
}

export const STOCK_KINDS: StockKind[] = ["ingredient", "basique", "petit_dej_gouter", "fruit", "maison"]
export const MEAL_SLOTS: MealSlot[] = ["petit_dej", "midi", "gouter", "soir"]
export const RECIPE_TAGS = Object.keys(TAG_LABELS) as RecipeTag[]
export const STOCK_CATEGORIES = Object.keys(CATEGORY_LABELS) as StockCategory[]

export const DEFAULT_CATEGORY: Record<StockKind, StockCategory> = {
  ingredient: "fruits_legumes",
  basique: "epicerie_salee",
  petit_dej_gouter: "epicerie_sucree",
  fruit: "fruits_legumes",
  maison: "entretien",
}

export const formatQuantity = (quantity: number | null, unit: string | null): string => {
  if (quantity === null) return ""
  const rounded = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/\.?0+$/, "")
  if (!unit || unit === "piece") return unit === "piece" ? `${rounded} pc` : rounded
  return `${rounded} ${unit}`
}
