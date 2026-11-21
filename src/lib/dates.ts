const pad = (value: number): string => String(value).padStart(2, "0")

export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const fromIsoDate = (iso: string): Date => {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

export const today = (): string => toIsoDate(new Date())

export const addDays = (iso: string, days: number): string => {
  const date = fromIsoDate(iso)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

export const daysBetween = (from: string, to: string): number =>
  Math.round((fromIsoDate(to).getTime() - fromIsoDate(from).getTime()) / 86_400_000)

const dayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" })
const shortFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" })

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

export const formatDay = (iso: string): string => capitalize(dayFormatter.format(fromIsoDate(iso)))

export const formatShortDay = (iso: string): string => capitalize(shortFormatter.format(fromIsoDate(iso)))

export const relativeDay = (iso: string, reference: string): string => {
  const delta = daysBetween(reference, iso)
  if (delta === 0) return "Aujourd'hui"
  if (delta === 1) return "Demain"
  if (delta === -1) return "Hier"
  return formatDay(iso)
}

export const expiryLabel = (iso: string, reference: string): string => {
  const delta = daysBetween(reference, iso)
  if (delta < 0) return `périmé depuis ${-delta} j`
  if (delta === 0) return "à finir aujourd'hui"
  if (delta === 1) return "à finir demain"
  return `encore ${delta} j`
}
