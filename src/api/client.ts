import { Cause, Data, Effect, Exit, Option, Schema } from "effect"

import {
  CookLog,
  Household,
  HouseholdNote,
  PantryOverview,
  PlannedMeal,
  Recipe,
  RecipeAvailability,
  RecipeContent,
  type MealSlot,
  type RecipeSource,
  type RecipeTag,
  ShoppingTrip,
  StockItem,
  type StockCategory,
  type ShoppingChannel,
  type StockKind,
  Suggestion,
} from "./schemas"

export class ApiError extends Data.TaggedError("ApiError")<{ status: number; message: string }> {}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
type Query = Record<string, string | number | boolean | null | undefined>

const buildUrl = (path: string, query?: Query): string => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== false && value !== "")
      params.set(key, String(value))
  }
  const search = params.toString()
  return `/api${path}${search ? `?${search}` : ""}`
}

const errorMessage = (body: unknown, fallback: string): string => {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = body.detail
    if (typeof detail === "string") return detail
    return JSON.stringify(detail)
  }
  return fallback
}

const send = (method: Method, path: string, options: { query?: Query; body?: unknown } = {}) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(buildUrl(path, options.query), {
          method,
          headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        }),
      catch: () => new ApiError({ status: 0, message: "Le serveur Popote ne répond pas." }),
    })
    if (response.status === 204) return null
    const body: unknown = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => new ApiError({ status: response.status, message: "Réponse illisible du serveur." }),
    })
    if (!response.ok) {
      return yield* Effect.fail(
        new ApiError({ status: response.status, message: errorMessage(body, response.statusText) }),
      )
    }
    return body
  })

const decoded = <A, I>(
  schema: Schema.Schema<A, I>,
  method: Method,
  path: string,
  options?: { query?: Query; body?: unknown },
) =>
  send(method, path, options).pipe(
    Effect.flatMap(Schema.decodeUnknown(schema)),
    Effect.mapError((error) =>
      error instanceof ApiError
        ? error
        : new ApiError({ status: 0, message: `Format inattendu : ${error.message}` }),
    ),
  )

const empty = (method: Method, path: string, options?: { query?: Query; body?: unknown }) =>
  send(method, path, options).pipe(Effect.asVoid)

export const runApi = async <A>(effect: Effect.Effect<A, ApiError>): Promise<A> => {
  const exit = await Effect.runPromiseExit(effect)
  if (Exit.isSuccess(exit)) return exit.value
  const failure = Cause.failureOption(exit.cause)
  throw Option.isSome(failure)
    ? failure.value
    : new ApiError({ status: 0, message: Cause.pretty(exit.cause) })
}

export type NewStockItem = {
  name: string
  kind: StockKind
  category: StockCategory
  channel?: ShoppingChannel
  quantity?: number | null
  unit?: string | null
  expires_on?: string | null
  running_low?: boolean
}

export type StockPatch = Partial<Omit<NewStockItem, "quantity" | "expires_on">> & {
  quantity?: number
  clear_quantity?: boolean
  expires_on?: string
  clear_expiry?: boolean
  running_low?: boolean
}

export type RecipeInput = RecipeContent & { cooks: string[]; fans: string[]; source?: RecipeSource }

export type SuggestionQuery = {
  on: string
  member?: string | null
  quick?: boolean
  mine?: boolean
  tag?: RecipeTag | null
  limit?: number
}

export const api = {
  household: () => decoded(Household, "GET", "/household"),
  stock: () => decoded(Schema.Array(StockItem), "GET", "/stock"),
  overview: (on: string) => decoded(PantryOverview, "GET", "/stock/overview", { query: { on } }),
  addStockItem: (item: NewStockItem) => decoded(StockItem, "POST", "/stock", { body: item }),
  updateStockItem: (id: string, patch: StockPatch) =>
    decoded(StockItem, "PATCH", `/stock/${id}`, { body: patch }),
  setRunningLow: (id: string, runningLow: boolean) =>
    decoded(StockItem, "PUT", `/stock/${id}/running-low`, { body: { running_low: runningLow } }),
  deleteStockItem: (id: string) => empty("DELETE", `/stock/${id}`),

  recipes: () => decoded(Schema.Array(Recipe), "GET", "/recipes"),
  createRecipe: (input: RecipeInput) => decoded(Recipe, "POST", "/recipes", { body: input }),
  replaceRecipe: (id: string, content: RecipeContent) =>
    decoded(Recipe, "PUT", `/recipes/${id}`, { body: content }),
  setRecipeMembers: (id: string, cooks: readonly string[], fans: readonly string[]) =>
    decoded(Recipe, "PUT", `/recipes/${id}/members`, { body: { cooks, fans } }),
  setPreference: (id: string, member: string, change: { can_cook?: boolean; likes?: boolean }) =>
    decoded(Recipe, "PUT", `/recipes/${id}/preferences`, { body: { member, ...change } }),
  deleteRecipe: (id: string) => empty("DELETE", `/recipes/${id}`),
  availability: (id: string, on: string) =>
    decoded(RecipeAvailability, "GET", `/recipes/${id}/availability`, { query: { on } }),
  draftRecipe: (request: string, member: string | null, quick: boolean, useStock: boolean) =>
    decoded(RecipeContent, "POST", "/recipes/drafts", {
      body: { request, member, quick, use_stock: useStock },
    }),
  draftRework: (id: string, instruction: string, member: string | null) =>
    decoded(RecipeContent, "POST", `/recipes/${id}/drafts`, { body: { instruction, member } }),
  cook: (id: string, member: string, servings: number, cookedOn: string) =>
    decoded(CookLog, "POST", `/recipes/${id}/cook`, { body: { member, servings, cooked_on: cookedOn } }),

  suggestions: (query: SuggestionQuery) =>
    decoded(Schema.Array(Suggestion), "GET", "/suggestions", { query }),

  weekLogs: (on: string) => decoded(Schema.Array(CookLog), "GET", "/cook-logs/week", { query: { on } }),
  undoCook: (id: string) => empty("DELETE", `/cook-logs/${id}`),

  plan: (start: string, end: string) =>
    decoded(Schema.Array(PlannedMeal), "GET", "/plan", { query: { start, end } }),
  planMeal: (plannedOn: string, slot: MealSlot, recipeId: string, cook: string | null) =>
    decoded(PlannedMeal, "POST", "/plan", {
      body: { planned_on: plannedOn, slot, recipe_id: recipeId, cook },
    }),
  removePlannedMeal: (id: string) => empty("DELETE", `/plan/${id}`),

  trips: () => decoded(Schema.Array(ShoppingTrip), "GET", "/shopping/trips"),
  notes: () => decoded(Schema.Array(HouseholdNote), "GET", "/notes"),
  addNote: (text: string, author: string | null) =>
    decoded(HouseholdNote, "POST", "/notes", { body: { text, author } }),
  deleteNote: (id: string) => empty("DELETE", `/notes/${id}`),
}
