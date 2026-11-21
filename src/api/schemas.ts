import { Schema } from "effect"

const Nullable = <A, I>(schema: Schema.Schema<A, I>) => Schema.NullOr(schema)

export const StockKind = Schema.Literal("ingredient", "basique", "petit_dej_gouter", "fruit", "maison")
export type StockKind = typeof StockKind.Type

export const ShoppingChannel = Schema.Literal("drive", "marche", "autre")
export type ShoppingChannel = typeof ShoppingChannel.Type

export const StockCategory = Schema.Literal(
  "fruits_legumes",
  "viande_poisson",
  "charcuterie",
  "cremerie",
  "epicerie_salee",
  "epicerie_sucree",
  "surgeles",
  "pain",
  "boissons",
  "hygiene",
  "entretien",
  "animaux",
  "autre",
)
export type StockCategory = typeof StockCategory.Type

export const MealSlot = Schema.Literal("petit_dej", "midi", "gouter", "soir")
export type MealSlot = typeof MealSlot.Type

export const RecipeTag = Schema.Literal(
  "rapide",
  "vegetarien",
  "poisson",
  "peruvien",
  "mijote",
  "leger",
  "a_congeler",
  "invites",
  "enfants",
  "saison",
  "dessert",
  "petit_dej",
)
export type RecipeTag = typeof RecipeTag.Type

export const RecipeSource = Schema.Literal("seed", "manuel", "chatgpt", "claude")
export type RecipeSource = typeof RecipeSource.Type

export const Household = Schema.Struct({
  members: Schema.Array(Schema.String),
  recipe_generation_enabled: Schema.Boolean,
})
export type Household = typeof Household.Type

export const StockItem = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  kind: StockKind,
  category: StockCategory,
  channel: ShoppingChannel,
  quantity: Nullable(Schema.Number),
  unit: Nullable(Schema.String),
  expires_on: Nullable(Schema.String),
  running_low: Schema.Boolean,
  is_out: Schema.Boolean,
  needs_restock: Schema.Boolean,
})
export type StockItem = typeof StockItem.Type

export const RecipeIngredient = Schema.Struct({
  name: Schema.String,
  quantity: Nullable(Schema.Number),
  unit: Nullable(Schema.String),
  optional: Schema.Boolean,
})
export type RecipeIngredient = typeof RecipeIngredient.Type

export const RecipeContent = Schema.Struct({
  title: Schema.String,
  summary: Schema.String,
  servings: Schema.Number,
  prep_minutes: Schema.Number,
  ingredients: Schema.Array(RecipeIngredient),
  steps: Schema.Array(Schema.String),
  tags: Schema.Array(RecipeTag),
})
export type RecipeContent = typeof RecipeContent.Type

export const Recipe = Schema.Struct({
  ...RecipeContent.fields,
  id: Schema.String,
  cooks: Schema.Array(Schema.String),
  fans: Schema.Array(Schema.String),
  source: RecipeSource,
  is_quick: Schema.Boolean,
})
export type Recipe = typeof Recipe.Type

export const IngredientCheck = Schema.Struct({
  name: Schema.String,
  optional: Schema.Boolean,
  status: Schema.Literal("disponible", "bientot_fini", "manquant"),
  stock_name: Nullable(Schema.String),
  expiring_soon: Schema.Boolean,
})
export type IngredientCheck = typeof IngredientCheck.Type

export const RecipeAvailability = Schema.Struct({
  recipe_id: Schema.String,
  checks: Schema.Array(IngredientCheck),
  required_count: Schema.Number,
  available_count: Schema.Number,
  ratio: Schema.Number,
  missing: Schema.Array(Schema.String),
  expiring: Schema.Array(Schema.String),
})
export type RecipeAvailability = typeof RecipeAvailability.Type

export const Suggestion = Schema.Struct({
  recipe: Recipe,
  availability: RecipeAvailability,
  score: Schema.Number,
  reasons: Schema.Array(Schema.String),
})
export type Suggestion = typeof Suggestion.Type

export const ConsumedIngredient = Schema.Struct({
  stock_item_id: Schema.String,
  name: Schema.String,
  quantity: Schema.Number,
  unit: Nullable(Schema.String),
})

export const CookLog = Schema.Struct({
  id: Schema.String,
  recipe_id: Nullable(Schema.String),
  recipe_title: Schema.String,
  cooked_by: Schema.String,
  cooked_on: Schema.String,
  servings: Schema.Number,
  consumed: Schema.Array(ConsumedIngredient),
  not_counted: Schema.Array(Schema.String),
  missing: Schema.Array(Schema.String),
})
export type CookLog = typeof CookLog.Type

export const PlannedMeal = Schema.Struct({
  id: Schema.String,
  planned_on: Schema.String,
  slot: MealSlot,
  recipe_id: Schema.String,
  cook: Nullable(Schema.String),
  note: Schema.String,
})
export type PlannedMeal = typeof PlannedMeal.Type

export const StockLine = Schema.Struct({
  name: Schema.String,
  kind: StockKind,
  category: StockCategory,
  quantity: Nullable(Schema.Number),
  unit: Nullable(Schema.String),
  expires_on: Nullable(Schema.String),
})
export type StockLine = typeof StockLine.Type

export const ToBuyItem = Schema.Struct({
  name: Schema.String,
  kind: StockKind,
  category: StockCategory,
  channel: ShoppingChannel,
  reason: Schema.String,
  preferred_product: Nullable(Schema.String),
})
export type ToBuyItem = typeof ToBuyItem.Type

export const PantryOverview = Schema.Struct({
  generated_on: Schema.String,
  to_buy_drive: Schema.Array(ToBuyItem),
  to_buy_fresh_market: Schema.Array(ToBuyItem),
  to_buy_other: Schema.Array(ToBuyItem),
  expiring_soon: Schema.Array(StockLine),
})
export type PantryOverview = typeof PantryOverview.Type

export const PurchasedItem = Schema.Struct({
  product_name: Schema.String,
  stock_name: Schema.String,
  packs: Schema.Number,
  unit_price: Nullable(Schema.Number),
})

export const ShoppingTrip = Schema.Struct({
  id: Schema.String,
  store: Schema.String,
  channel: ShoppingChannel,
  shopped_on: Schema.String,
  items: Schema.Array(PurchasedItem),
  total: Nullable(Schema.Number),
  notes: Schema.String,
})
export type ShoppingTrip = typeof ShoppingTrip.Type

export const HouseholdNote = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  author: Nullable(Schema.String),
})
export type HouseholdNote = typeof HouseholdNote.Type
