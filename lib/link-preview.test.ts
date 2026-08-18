import { describe, expect, it } from "vitest";
import { parseOgTags } from "./link-preview";

const OG_HTML = `
  <html>
    <head>
      <title>Fallback title</title>
      <meta property="og:title" content="OG Title" />
      <meta property="og:description" content="OG Description" />
      <meta property="og:image" content="https://cdn.example/og.jpg" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Twitter Title" />
      <meta name="twitter:description" content="Twitter Description" />
      <meta name="twitter:image" content="https://cdn.example/twitter.jpg" />
    </head>
  </html>
`;

const TWITTER_ONLY_HTML = `
  <html>
    <head>
      <title>Page title</title>
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Twitter Title" />
      <meta name="twitter:description" content="Twitter Description" />
      <meta name="twitter:image" content="https://cdn.example/twitter.jpg" />
    </head>
  </html>
`;

const TITLE_ONLY_HTML = `
  <html>
    <head>
      <title>Just the title</title>
    </head>
  </html>
`;

describe("parseOgTags", () => {
  it("reads og title, description and image", () => {
    expect(parseOgTags(OG_HTML)).toEqual({
      description: "OG Description",
      image: "https://cdn.example/og.jpg",
      title: "OG Title",
    });
  });

  it("returns all nulls for empty html", () => {
    expect(parseOgTags("")).toEqual({
      description: null,
      image: null,
      title: null,
    });
  });

  it("prefers og tags over twitter tags", () => {
    expect(parseOgTags(OG_HTML)).toEqual({
      description: "OG Description",
      image: "https://cdn.example/og.jpg",
      title: "OG Title",
    });
  });

  it("falls back to twitter tags when og is missing", () => {
    expect(parseOgTags(TWITTER_ONLY_HTML)).toEqual({
      description: "Twitter Description",
      image: "https://cdn.example/twitter.jpg",
      title: "Twitter Title",
    });
  });

  it("falls back to the document title when og and twitter titles are missing", () => {
    expect(parseOgTags(TITLE_ONLY_HTML)).toEqual({
      description: null,
      image: null,
      title: "Just the title",
    });
  });
});
