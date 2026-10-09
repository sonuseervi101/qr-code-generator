import { describe, expect, it } from "vitest";
import { buildQrValue } from "./qr";
import { parseQrValue } from "./parse";
import { encodeShare, decodeShare, readShareFromHash } from "./share";
import { DEFAULT_DATA, DEFAULT_SETTINGS } from "./constants";

const data = (overrides) => ({ ...DEFAULT_DATA, ...overrides });

// Building a code, scanning it and building it again must give the same text.
const roundTrips = [
  ["url", { url: "https://gdgsrm.com/events?x=1" }],
  ["text", { text: "Hello GDG 👋" }],
  ["email", { email: "team@gdgsrm.com", subject: "Join us", body: "See you & bye" }],
  ["phone", { phone: "+919876543210" }],
  ["wifi", { ssid: "GDG;Campus", password: "pa:ss,word1", security: "WPA" }],
  ["wifi", { ssid: "Open Cafe", security: "nopass", hidden: true }],
  ["upi", { upiId: "sonu@okaxis", payeeName: "Sonu S", amount: "150.5", note: "Club fee" }],
  ["vcard", { firstName: "Sonu", lastName: "Seervi", org: "GDG; SRM", phone: "+919876543210", email: "a@b.com", website: "https://x.com" }],
  ["whatsapp", { phone: "+919876543210", message: "Hi! Is this free?" }],
  ["sms", { phone: "+919876543210", message: "Meet at 5:30" }],
  ["location", { lat: "12.823", lng: "80.0444", placeName: "SRM Tech Park" }],
];

describe("parseQrValue round trip", () => {
  it.each(roundTrips)("%s survives build → scan → build", (type, fields) => {
    const { value, error } = buildQrValue(type, data(fields));
    expect(error).toBeUndefined();
    const parsed = parseQrValue(value);
    expect(parsed.type).toBe(type);
    expect(buildQrValue(parsed.type, parsed.data).value).toBe(value);
  });

  it("treats unknown content as plain text", () => {
    expect(parseQrValue("just some words").type).toBe("text");
  });
});

describe("new types", () => {
  it("builds a UPI link with formatted amount", () => {
    expect(buildQrValue("upi", data({ upiId: "asha@ybl", payeeName: "Asha", amount: "99" })).value).toBe(
      "upi://pay?pa=asha@ybl&pn=Asha&am=99.00&cu=INR"
    );
  });

  it("rejects bad UPI ids and amounts", () => {
    expect(buildQrValue("upi", data({ upiId: "nobank", payeeName: "A" })).error).toBeDefined();
    expect(buildQrValue("upi", data({ upiId: "a@ybl", payeeName: "A", amount: "-5" })).error).toBeDefined();
    expect(buildQrValue("upi", data({ upiId: "a@ybl", payeeName: "A", amount: "200000" })).error).toBeDefined();
  });

  it("requires a country code for WhatsApp", () => {
    expect(buildQrValue("whatsapp", data({ phone: "98765432" })).error).toBeDefined();
  });

  it("validates location ranges", () => {
    expect(buildQrValue("location", data({ lat: "95", lng: "10" })).error).toBeDefined();
  });

  it("needs a name and a way to contact for vCard", () => {
    expect(buildQrValue("vcard", data({ phone: "+919876543210" })).error).toBeDefined();
    expect(buildQrValue("vcard", data({ firstName: "A" })).error).toBeDefined();
  });
});

describe("share links", () => {
  it("encode and decode give back the same state, including emoji", () => {
    const state = { type: "text", data: data({ text: "नमस्ते 👋" }), settings: DEFAULT_SETTINGS };
    const code = encodeShare(state);
    expect(code).toMatch(/^[\w-]+$/);
    expect(decodeShare(code)).toEqual(state);
    expect(readShareFromHash("#d=" + code)).toEqual(state);
  });

  it("ignores broken links", () => {
    expect(decodeShare("not-valid!!")).toBeNull();
    expect(readShareFromHash("#something-else")).toBeNull();
  });
});
