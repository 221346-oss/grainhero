import { describe, expect, it } from "vitest";
import { UNASSIGNED_CITY, cityKey, deriveCity, groupByCity } from "../../src/lib/location-scope";

describe("deriveCity", () => {
  it("prefers the location_city column", () => {
    expect(
      deriveCity({
        location_city: "Karachi",
        location: { city: "Ignored", address: "Ignored" },
        name: "Ignored — A",
      }),
    ).toBe("Karachi");
  });

  it("falls back to location.city, then description", () => {
    expect(deriveCity({ location: { city: "Hyderabad" } })).toBe("Hyderabad");
    // The SQL dedup treats `description` as a city label, so we must too.
    expect(deriveCity({ location: { description: "Rawalpindi" } })).toBe("Rawalpindi");
  });

  it('reads the "City — XXX" name prefix written by the provisioning trigger', () => {
    expect(deriveCity({ name: "Karachi — A" })).toBe("Karachi");
    expect(deriveCity({ name: "  Lahore  —  B  " })).toBe("Lahore");
  });

  it("does not mistake a plain name for a city prefix", () => {
    expect(deriveCity({ name: "Main Warehouse" })).toBe(UNASSIGNED_CITY);
    // A trailing dash with nothing after it is not a prefix.
    expect(deriveCity({ name: "Warehouse —" })).toBe(UNASSIGNED_CITY);
  });

  it("uses the first address segment as a last resort", () => {
    expect(deriveCity({ location: { address: "Karachi, Sindh, Pakistan" } })).toBe("Karachi");
  });

  it("buckets warehouses with no usable location", () => {
    expect(deriveCity({})).toBe(UNASSIGNED_CITY);
    expect(deriveCity({ location: null, location_city: "   " })).toBe(UNASSIGNED_CITY);
  });
});

describe("cityKey", () => {
  it("ignores case and collapses whitespace", () => {
    expect(cityKey("Karachi")).toBe(cityKey("  KARACHI  "));
    expect(cityKey("Dera  Ghazi   Khan")).toBe(cityKey("dera ghazi khan"));
  });
});

describe("groupByCity", () => {
  it("merges spellings of the same city into one group", () => {
    // The exact failure the region-aware dedup migration exists to fix: the
    // same city arriving with different casing, padding and source fields.
    const groups = groupByCity([
      { name: "A", location_city: "Karachi" },
      { name: "B", location: { city: "  karachi " } },
      { name: "C", location: { description: "KARACHI" } },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].warehouses).toHaveLength(3);
    // First spelling encountered wins as the display label.
    expect(groups[0].city).toBe("Karachi");
  });

  it("keeps distinct cities apart", () => {
    const groups = groupByCity([
      { name: "A", location_city: "Karachi" },
      { name: "B", location_city: "Hyderabad" },
      { name: "C", location_city: "Karachi" },
    ]);

    expect(groups.map((g) => g.city).sort()).toEqual(["Hyderabad", "Karachi"]);
    expect(groups.find((g) => g.city === "Karachi")?.warehouses).toHaveLength(2);
    expect(groups.find((g) => g.city === "Hyderabad")?.warehouses).toHaveLength(1);
  });

  it("sorts alphabetically and pins the unassigned bucket last", () => {
    const groups = groupByCity([
      { name: "no location" },
      { name: "B", location_city: "Rawalpindi" },
      { name: "A", location_city: "Hyderabad" },
    ]);

    expect(groups.map((g) => g.city)).toEqual(["Hyderabad", "Rawalpindi", UNASSIGNED_CITY]);
  });

  it("returns no groups for no warehouses", () => {
    expect(groupByCity([])).toEqual([]);
  });
});
