import { describe, expect, it } from "vitest"

import { addDays, daysBetween, expiryLabel, relativeDay, seasonOf } from "./dates"
import { formatQuantity, seasonsSummary } from "./labels"
import { resolveMember } from "./member"
import { searchKey } from "./search"
import { Option } from "effect"

describe("dates", () => {
  it("finds the meteorological season", () => {
    expect(seasonOf("2026-11-21")).toBe("automne")
    expect(seasonOf("2026-12-01")).toBe("hiver")
    expect(seasonOf("2027-02-28")).toBe("hiver")
    expect(seasonOf("2027-03-01")).toBe("printemps")
    expect(seasonOf("2027-07-14")).toBe("ete")
    expect(seasonsSummary([])).toBe("Toute l'année")
  })

  it("adds days across months", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
  })

  it("labels relative days and expiry", () => {
    expect(relativeDay("2026-11-21", "2026-11-21")).toBe("Aujourd'hui")
    expect(relativeDay("2026-11-22", "2026-11-21")).toBe("Demain")
    expect(daysBetween("2026-11-21", "2026-11-24")).toBe(3)
    expect(expiryLabel("2026-11-20", "2026-11-21")).toBe("périmé depuis 1 j")
    expect(expiryLabel("2026-11-22", "2026-11-21")).toBe("à finir demain")
  })
})

describe("labels", () => {
  it("formats quantities without trailing zeros", () => {
    expect(formatQuantity(1.5, "kg")).toBe("1.5 kg")
    expect(formatQuantity(3, "piece")).toBe("3 pc")
    expect(formatQuantity(0.25, null)).toBe("0.25")
    expect(formatQuantity(null, "g")).toBe("")
  })
})

describe("member", () => {
  it("resolves the stored member case-insensitively", () => {
    expect(resolveMember(Option.some("carla"), ["Tim", "Carla"])).toBe("Carla")
    expect(resolveMember(Option.some("Paul"), ["Tim", "Carla"])).toBeNull()
    expect(resolveMember(Option.none(), ["Tim"])).toBeNull()
  })
})

describe("search", () => {
  it("ignores accents and ligatures", () => {
    expect(searchKey("Bœuf à la CRÈME")).toBe("boeuf a la creme")
  })
})
