import { describe, expect, it } from "vitest";
import { tallyJobs, tallySales, tallyTravel } from "./home-summaries";

describe("tallyTravel", () => {
  it("returns zeros for an empty list", () => {
    expect(tallyTravel([])).toEqual({ pending: 0, ready: 0 });
  });

  it("counts null status as pending", () => {
    expect(tallyTravel([{ status: null }])).toEqual({ pending: 1, ready: 0 });
  });

  it("counts pending and ready folders", () => {
    expect(
      tallyTravel([{ status: "pending" }, { status: "ready" }, { status: "ready" }]),
    ).toEqual({ pending: 1, ready: 2 });
  });

  it("ignores unknown statuses", () => {
    expect(tallyTravel([{ status: "packed" }])).toEqual({ pending: 0, ready: 0 });
  });
});

describe("tallySales", () => {
  it("returns zeros for an empty list", () => {
    expect(tallySales([])).toEqual({ available: 0, sold: 0 });
  });

  it("counts null status as available", () => {
    expect(tallySales([{ status: null }])).toEqual({ available: 1, sold: 0 });
  });

  it("counts available and sold folders", () => {
    expect(
      tallySales([{ status: "available" }, { status: "sold" }, { status: "sold" }]),
    ).toEqual({ available: 1, sold: 2 });
  });

  it("does not treat unknown or non-sold statuses as available", () => {
    expect(tallySales([{ status: "reserved" }])).toEqual({ available: 0, sold: 0 });
  });
});

describe("tallyJobs", () => {
  it("returns zeros for an empty list", () => {
    expect(tallyJobs([])).toEqual({ active: 0, interview: 0 });
  });

  it("counts null as active but not interview", () => {
    expect(tallyJobs([{ status: null }])).toEqual({ active: 1, interview: 0 });
  });

  it("counts saved, applied, and interview as active", () => {
    expect(
      tallyJobs([{ status: "saved" }, { status: "applied" }, { status: "interview" }]),
    ).toEqual({ active: 3, interview: 1 });
  });

  it("counts only interview in the interview tally", () => {
    expect(
      tallyJobs([{ status: "interview" }, { status: "interview" }, { status: "applied" }]),
    ).toEqual({ active: 3, interview: 2 });
  });

  it("ignores offer, rejected, and unknown statuses", () => {
    expect(
      tallyJobs([{ status: "offer" }, { status: "rejected" }, { status: "ghosted" }]),
    ).toEqual({ active: 0, interview: 0 });
  });
});
