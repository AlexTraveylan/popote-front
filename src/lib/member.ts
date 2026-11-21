import { Effect, Option } from "effect"

const STORAGE_KEY = "popote.member"

export const readStoredMember = (): Option.Option<string> =>
  Effect.try(() => window.localStorage.getItem(STORAGE_KEY)).pipe(
    Effect.map(Option.fromNullable),
    Effect.orElseSucceed(() => Option.none<string>()),
    Effect.runSync,
  )

export const storeMember = (member: string | null): void => {
  Effect.try(() => {
    if (member === null) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, member)
  }).pipe(Effect.ignore, Effect.runSync)
}

export const resolveMember = (stored: Option.Option<string>, members: readonly string[]): string | null =>
  Option.getOrNull(
    Option.flatMap(stored, (name) =>
      Option.fromNullable(members.find((member) => member.toLowerCase() === name.toLowerCase())),
    ),
  )
