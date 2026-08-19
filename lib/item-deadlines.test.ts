import { describe, expect, it } from "vitest";

import { countdownDayLabel, orbitDeadlineRow, shouldDeleteDeadline } from "./item-deadlines";

describe("orbitDeadlineRow", () => {
  it("maps an item to an orbit_item deadline row", () => {
    expect(orbitDeadlineRow({ id: "x", title: "Entrevista", dueDate: "2026-09-01T15:00:00.000Z" })).toEqual({
      due_date: "2026-09-01T15:00:00.000Z",
      image_url: null,
      is_recurring: false,
      source_id: "x",
      space_type: "orbit_item",
      status: "active",
      title: "Entrevista",
    });
  });

  it("uses orbit_item as space_type", () => {
    expect(orbitDeadlineRow({ id: "x", title: "Entrevista", dueDate: "2026-09-01T15:00:00.000Z" }).space_type).toBe(
      "orbit_item",
    );
  });
});

describe("shouldDeleteDeadline", () => {
  it("is true only when dueDate is null", () => {
    expect(shouldDeleteDeadline(null)).toBe(true);
    expect(shouldDeleteDeadline("2026-09-01T15:00:00.000Z")).toBe(false);
  });
});

describe("countdownDayLabel", () => {
  it("formats upcoming, today, and past day counts in Spanish", () => {
    expect(countdownDayLabel(12)).toBe("Faltan 12 días");
    expect(countdownDayLabel(0)).toBe("Hoy");
    expect(countdownDayLabel(-3)).toBe("Hace 3 días");
  });
});
