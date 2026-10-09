import { describe, expect, it } from "vitest";
import { parseBulkInput, slugify } from "./bulk";

describe("parseBulkInput", () => {
  it("makes one row per non-empty line with unique file names", () => {
    const { rows, problems } = parseBulkInput("https://a.com\n\nhello\nhello\n", false);
    expect(problems).toEqual([]);
    expect(rows.map((r) => r.fileName)).toEqual(["1-a-com", "2-hello", "3-hello"]);
  });

  it("reads name,content rows and quoted CSV values", () => {
    const { rows } = parseBulkInput('Ravi,https://x.com/ravi\nPriya,"Hi, I am Priya"', true);
    expect(rows).toEqual([
      { fileName: "1-ravi", content: "https://x.com/ravi" },
      { fileName: "2-priya", content: "Hi, I am Priya" },
    ]);
  });

  it("reports bad rows instead of failing", () => {
    const { rows, problems } = parseBulkInput("no comma here\nok,content", true);
    expect(rows).toHaveLength(1);
    expect(problems[0]).toContain("Line 1");
  });

  it("caps the number of rows", () => {
    const { rows, problems } = parseBulkInput(Array.from({ length: 250 }, (_, i) => `item ${i}`).join("\n"), false);
    expect(rows).toHaveLength(200);
    expect(problems.at(-1)).toContain("200");
  });
});

describe("slugify", () => {
  it("creates safe file names", () => {
    expect(slugify("https://GDG SRM.com/Events?x=1")).toBe("gdg-srm-com-events-x-1");
    expect(slugify("!!!")).toBe("qr");
  });
});
