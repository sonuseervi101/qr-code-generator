import { describe, expect, it } from "vitest";
import { buildQrValue, contrastRatio, escapeWifi, getScanWarnings } from "./qr";
import { DEFAULT_DATA, DEFAULT_SETTINGS } from "./constants";

const data = (overrides) => ({ ...DEFAULT_DATA, ...overrides });
const settings = (overrides) => ({ ...DEFAULT_SETTINGS, ...overrides });

describe("buildQrValue", () => {
  it("accepts a valid URL", () => {
    expect(buildQrValue("url", data({ url: "https://gdgsrm.com" }))).toEqual({ value: "https://gdgsrm.com" });
  });

  it("rejects URLs without http/https or without a domain", () => {
    expect(buildQrValue("url", data({ url: "ftp://site.com" })).error).toBeDefined();
    expect(buildQrValue("url", data({ url: "https://localhost" })).error).toBeDefined();
    expect(buildQrValue("url", data({ url: "not a url" })).error).toBeDefined();
  });

  it("builds a mailto link with encoded subject and body", () => {
    const { value } = buildQrValue("email", data({ email: "a@b.com", subject: "Hi there", body: "A&B" }));
    expect(value).toBe("mailto:a@b.com?subject=Hi%20there&body=A%26B");
  });

  it("rejects an invalid email", () => {
    expect(buildQrValue("email", data({ email: "abc" })).error).toBeDefined();
  });

  it("cleans spaces and dashes from phone numbers", () => {
    expect(buildQrValue("phone", data({ phone: "+91 98765-43210" }))).toEqual({ value: "tel:+919876543210" });
    expect(buildQrValue("phone", data({ phone: "12" })).error).toBeDefined();
  });

  it("builds the Wi-Fi format and escapes special characters", () => {
    const { value } = buildQrValue("wifi", data({ ssid: "My;Net", password: "pass:word1", security: "WPA" }));
    expect(value).toBe("WIFI:T:WPA;S:My\\;Net;P:pass\\:word1;;");
  });

  it("omits the password for open Wi-Fi and enforces WPA length", () => {
    expect(buildQrValue("wifi", data({ ssid: "Cafe", security: "nopass" })).value).toBe("WIFI:T:nopass;S:Cafe;;");
    expect(buildQrValue("wifi", data({ ssid: "Home", password: "short", security: "WPA" })).error).toBeDefined();
  });

  it("limits text length", () => {
    expect(buildQrValue("text", data({ text: "x".repeat(1001) })).error).toBeDefined();
  });
});

describe("escapeWifi", () => {
  it("escapes \\ ; , : and quotes", () => {
    expect(escapeWifi('a\\b;c,d:e"f')).toBe('a\\\\b\\;c\\,d\\:e\\"f');
  });
});

describe("contrastRatio", () => {
  it("is 21:1 for black on white and 1:1 for equal colours", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });
});

describe("getScanWarnings", () => {
  const value = "https://gdgsrm.com";

  it("has no warnings for the default design", () => {
    expect(getScanWarnings(settings(), value)).toEqual([]);
  });

  it("flags low contrast and inverted colours", () => {
    const texts = getScanWarnings(settings({ fgColor: "#ffffff", bgColor: "#000000" }), value).map((w) => w.text);
    expect(texts.some((t) => t.includes("inverted"))).toBe(true);
    expect(getScanWarnings(settings({ fgColor: "#dddddd" }), value)[0].level).toBe("error");
  });

  it("checks the gradient's second colour too", () => {
    const warnings = getScanWarnings(settings({ useGradient: true, gradientColor: "#fff9c4" }), value);
    expect(warnings.some((w) => w.text.includes("contrast"))).toBe(true);
  });

  it("warns about a small quiet zone", () => {
    expect(getScanWarnings(settings({ margin: 1 }), value)[0].level).toBe("error");
    expect(getScanWarnings(settings({ margin: 3 }), value)[0].level).toBe("warn");
  });

  it("requires high error correction with a logo", () => {
    const warnings = getScanWarnings(settings({ logo: "data:image/png;base64,x", level: "M" }), value);
    expect(warnings.some((w) => w.text.includes("logo"))).toBe(true);
    expect(getScanWarnings(settings({ logo: "data:image/png;base64,x", level: "H" }), value)).toEqual([]);
  });

  it("returns nothing when there is no value", () => {
    expect(getScanWarnings(settings(), undefined)).toEqual([]);
  });
});
