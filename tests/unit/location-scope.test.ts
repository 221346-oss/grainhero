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

  it("never treats a generic word as a city", () => {
    // Plenty of rows predate the "City — XXX" naming or were typed by hand, and
    // reading their prefix literally puts "Warehouse" on the picker beside
    // Lahore as though it were a place.
    expect(deriveCity({ name: "Warehouse — A" })).toBe(UNASSIGNED_CITY);
    expect(deriveCity({ location_city: "warehouse" })).toBe(UNASSIGNED_CITY);
    expect(deriveCity({ location: { city: "  Unknown  " } })).toBe(UNASSIGNED_CITY);
    expect(deriveCity({ location: { address: "Storage, Punjab" } })).toBe(UNASSIGNED_CITY);
    // A single character is not a place name either.
    expect(deriveCity({ location_city: "x" })).toBe(UNASSIGNED_CITY);
  });

  it("rejects raw coordinates that leak into the city field", () => {
    // A map picker writing the wrong part of its result leaves a latitude
    // sitting where a city should be; it must not become a card on the picker.
    expect(deriveCity({ location_city: "33.607377" })).toBe(UNASSIGNED_CITY);
    expect(deriveCity({ location: { city: "-74.006" } })).toBe(UNASSIGNED_CITY);
    expect(deriveCity({ location_city: "  12345  " })).toBe(UNASSIGNED_CITY);
    // But a real name containing digits is fine.
    expect(deriveCity({ location_city: "Sector 12" })).toBe("Sector 12");
  });

  it("falls through to a later source when an earlier one is generic", () => {
    // A junk location_city must not shadow a real city sitting behind it.
    expect(deriveCity({ location_city: "warehouse", location: { city: "Lahore" } })).toBe("Lahore");
    expect(deriveCity({ location_city: "unknown", name: "Karachi — B" })).toBe("Karachi");
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
