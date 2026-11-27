import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Effect } from "effect"

import { api, type ApiError, runApi, type SuggestionQuery } from "./client"

export const useHousehold = () =>
  useQuery({ queryKey: ["household"], queryFn: () => runApi(api.household()) })

export const useStock = () => useQuery({ queryKey: ["stock"], queryFn: () => runApi(api.stock()) })

export const useOverview = (day: string) =>
  useQuery({ queryKey: ["overview", day], queryFn: () => runApi(api.overview(day)) })

export const useRecipes = () => useQuery({ queryKey: ["recipes"], queryFn: () => runApi(api.recipes()) })

export const useSuggestions = (query: SuggestionQuery) =>
  useQuery({ queryKey: ["suggestions", query], queryFn: () => runApi(api.suggestions(query)) })

export const useAvailability = (recipeId: string, day: string) =>
  useQuery({
    queryKey: ["availability", recipeId, day],
    queryFn: () => runApi(api.availability(recipeId, day)),
  })

export const useTrips = () => useQuery({ queryKey: ["trips"], queryFn: () => runApi(api.trips()) })

export const useNotes = () => useQuery({ queryKey: ["notes"], queryFn: () => runApi(api.notes()) })

export const useApiMutation = <Input, Output>(action: (input: Input) => Effect.Effect<Output, ApiError>) => {
  const client = useQueryClient()
  return useMutation<Output, ApiError, Input>({
    mutationFn: (input) => runApi(action(input)),
    onSuccess: () => client.invalidateQueries(),
  })
}
