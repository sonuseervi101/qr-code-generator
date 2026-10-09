// The reverse of buildQrValue: takes the text read from a scanned QR code
// and works out which type it is and what the form fields should be.
// Used by the Scanner so a scanned code can be opened in the editor.
import { DEFAULT_DATA } from "./constants";

export function parseQrValue(raw) {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const result = (type, fields) => ({ type, data: { ...DEFAULT_DATA, url: "", ...fields } });

  if (lower.startsWith("upi://pay")) {
    const params = new URLSearchParams(text.slice(text.indexOf("?") + 1));
    return result("upi", {
      upiId: params.get("pa") || "",
      payeeName: params.get("pn") || "",
      amount: params.get("am") || "",
      note: params.get("tn") || "",
    });
  }

  if (lower.startsWith("https://wa.me/")) {
    const url = new URL(text);
    return result("whatsapp", { phone: "+" + url.pathname.slice(1), message: url.searchParams.get("text") || "" });
  }

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    return result("url", { url: text });
  }

  if (lower.startsWith("mailto:")) {
    const [address, query = ""] = text.slice(7).split("?");
    const params = new URLSearchParams(query);
    return result("email", { email: decodeURIComponent(address), subject: params.get("subject") || "", body: params.get("body") || "" });
  }

  if (lower.startsWith("tel:")) {
    return result("phone", { phone: text.slice(4) });
  }

  if (lower.startsWith("smsto:")) {
    const rest = text.slice(6);
    const split = rest.indexOf(":");
    return split === -1
      ? result("sms", { phone: rest })
      : result("sms", { phone: rest.slice(0, split), message: rest.slice(split + 1) });
  }

  if (lower.startsWith("geo:")) {
    const [lat, lng] = text.slice(4).split("?")[0].split(",");
    const label = text.match(/\(([^)]*)\)$/);
    return result("location", { lat, lng, placeName: label ? decodeURIComponent(label[1]) : "" });
  }

  if (lower.startsWith("wifi:")) {
    const fields = splitEscaped(text.slice(5));
    return result("wifi", {
      ssid: fields.S || "",
      password: fields.P || "",
      security: fields.T === "WEP" ? "WEP" : fields.T === "nopass" || !fields.P ? "nopass" : "WPA",
      hidden: fields.H === "true",
    });
  }

  if (lower.startsWith("begin:vcard")) {
    const get = (key, raw = false) => {
      const line = text.split(/\r?\n/).find((l) => l.toUpperCase().startsWith(key));
      if (!line) return "";
      const value = line.slice(line.indexOf(":") + 1);
      return raw ? value : unescapeVcard(value);
    };
    const [last = "", first = ""] = splitUnescaped(get("N:", true) || get("N;", true));
    return result("vcard", {
      firstName: first || get("FN:"),
      lastName: last,
      org: get("ORG"),
      phone: get("TEL"),
      email: get("EMAIL"),
      website: get("URL"),
    });
  }

  return result("text", { text });
}

// Splits "T:WPA;S:My\;Net;P:pass;;" into { T: "WPA", S: "My;Net", P: "pass" },
// respecting backslash escapes.
function splitEscaped(body) {
  const fields = {};
  let key = "";
  let value = "";
  let inValue = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "\\" && i + 1 < body.length) {
      value += body[++i];
    } else if (!inValue && ch === ":") {
      inValue = true;
    } else if (ch === ";") {
      if (key) fields[key] = value;
      key = "";
      value = "";
      inValue = false;
    } else if (inValue) {
      value += ch;
    } else {
      key += ch;
    }
  }
  return fields;
}

function splitUnescaped(value) {
  return value.split(/(?<!\\);/).map(unescapeVcard);
}

function unescapeVcard(value) {
  return value.replace(/\\n/g, "\n").replace(/\\([\\,;])/g, "$1");
}
