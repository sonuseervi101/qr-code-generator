// Pure helper functions: no React, no DOM.
// Keeping them separate from the UI makes them easy to test (see qr.test.js).
import qrcode from "qrcode-generator";

// Wi-Fi QR format needs \ ; , : " escaped with a backslash.
export function escapeWifi(value) {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

// Turns the form data into the text stored inside the QR code.
// Returns { value } when the input is valid, or { error } when it is not.
export function buildQrValue(type, data) {
  if (type === "url") {
    const url = data.url.trim();
    if (!url) return { error: "Enter a URL." };
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { error: "URL must start with http:// or https://" };
      }
      if (!parsed.hostname.includes(".")) {
        return { error: "Enter a full address, like https://example.com" };
      }
    } catch {
      return { error: "Enter a valid URL, like https://example.com" };
    }
    return { value: url };
  }

  if (type === "text") {
    if (!data.text.trim()) return { error: "Enter some text." };
    if (data.text.length > 1000) return { error: "Text is too long (max 1000 characters)." };
    return { value: data.text };
  }

  if (type === "email") {
    const email = data.email.trim();
    if (!email) return { error: "Enter an email address." };
    if (!EMAIL_RE.test(email)) {
      return { error: "Enter a valid email address, like name@example.com" };
    }
    const params = [];
    if (data.subject.trim()) params.push("subject=" + encodeURIComponent(data.subject.trim()));
    if (data.body.trim()) params.push("body=" + encodeURIComponent(data.body.trim()));
    return { value: "mailto:" + email + (params.length ? "?" + params.join("&") : "") };
  }

  if (type === "phone") {
    const phone = cleanPhone(data.phone);
    if (phone.error) return phone;
    return { value: "tel:" + phone.value };
  }

  if (type === "wifi") {
    if (!data.ssid.trim()) return { error: "Enter the network name (SSID)." };
    if (data.security !== "nopass" && !data.password) {
      return { error: "Enter the Wi-Fi password, or choose 'No password'." };
    }
    if (data.security === "WPA" && data.password.length < 8) {
      return { error: "WPA passwords must be at least 8 characters." };
    }
    let value = `WIFI:T:${data.security};S:${escapeWifi(data.ssid)};`;
    if (data.security !== "nopass") value += `P:${escapeWifi(data.password)};`;
    if (data.hidden) value += "H:true;";
    return { value: value + ";" };
  }

  if (type === "upi") {
    // Standard UPI deep link, understood by GPay, PhonePe, Paytm and BHIM.
    const id = data.upiId.trim();
    if (!id) return { error: "Enter a UPI ID, like name@okaxis." };
    if (!/^[\w.-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(id)) {
      return { error: "UPI ID should look like name@bank (e.g. sonu@okaxis)." };
    }
    if (!data.payeeName.trim()) return { error: "Enter the payee's name." };
    // "@" is left as-is because that is how payment apps expect UPI IDs.
    const params = [`pa=${encodeURIComponent(id).replace("%40", "@")}`, `pn=${encodeURIComponent(data.payeeName.trim())}`];
    if (data.amount.trim()) {
      const amount = Number(data.amount);
      if (!/^\d+(\.\d{1,2})?$/.test(data.amount.trim()) || amount <= 0) {
        return { error: "Amount must be a positive number with up to 2 decimals." };
      }
      if (amount > 100000) return { error: "UPI payments are limited to ₹1,00,000." };
      params.push(`am=${amount.toFixed(2)}`);
    }
    params.push("cu=INR");
    if (data.note.trim()) params.push(`tn=${encodeURIComponent(data.note.trim())}`);
    return { value: "upi://pay?" + params.join("&") };
  }

  if (type === "vcard") {
    // vCard 3.0: scanning it offers to save a new contact.
    const first = data.firstName.trim();
    const last = data.lastName.trim();
    if (!first && !last) return { error: "Enter a first or last name." };
    const phone = data.phone.trim() ? cleanPhone(data.phone) : null;
    if (phone?.error) return phone;
    const email = data.email.trim();
    if (email && !EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
    if (!phone && !email) return { error: "Add a phone number or an email." };
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${escapeVcard(last)};${escapeVcard(first)};;;`,
      `FN:${escapeVcard([first, last].filter(Boolean).join(" "))}`,
    ];
    if (data.org.trim()) lines.push(`ORG:${escapeVcard(data.org.trim())}`);
    if (phone) lines.push(`TEL;TYPE=CELL:${phone.value}`);
    if (email) lines.push(`EMAIL:${email}`);
    if (data.website.trim()) lines.push(`URL:${data.website.trim()}`);
    lines.push("END:VCARD");
    return { value: lines.join("\n") };
  }

  if (type === "whatsapp") {
    const phone = cleanPhone(data.phone);
    if (phone.error) return phone;
    const digits = phone.value.replace("+", "");
    if (digits.length < 10) return { error: "Include the country code, e.g. +91 98765 43210." };
    const text = data.message.trim() ? "?text=" + encodeURIComponent(data.message.trim()) : "";
    return { value: `https://wa.me/${digits}${text}` };
  }

  if (type === "sms") {
    const phone = cleanPhone(data.phone);
    if (phone.error) return phone;
    if (data.message.length > 500) return { error: "Message is too long (max 500 characters)." };
    return { value: `SMSTO:${phone.value}:${data.message}` };
  }

  if (type === "location") {
    if (data.lat === "" || data.lng === "") return { error: "Enter latitude and longitude, or use your current location." };
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: "Latitude must be between -90 and 90." };
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: "Longitude must be between -180 and 180." };
    const coords = `${round6(lat)},${round6(lng)}`;
    const label = data.placeName.trim() ? `(${encodeURIComponent(data.placeName.trim())})` : "";
    return { value: `geo:${coords}?q=${coords}${label}` };
  }

  return { error: "Unknown QR type." };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

// Removes spaces, dashes and brackets, then checks the number of digits.
export function cleanPhone(raw) {
  const phone = raw.replace(/[\s()-]/g, "");
  if (!phone) return { error: "Enter a phone number." };
  if (!/^\+?[0-9]{7,15}$/.test(phone)) {
    return { error: "Phone number should have 7–15 digits and may start with +" };
  }
  return { value: phone };
}

// vCard needs \ , ; and new lines escaped.
export function escapeVcard(value) {
  return value.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
}

// Relative brightness of a colour (0 = black, 1 = white), using the WCAG formula.
export function luminance(hex) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// How many modules (squares) wide the QR code is for this content.
// More data or a higher error-correction level means more modules.
export function getModuleCount(value, level) {
  const qr = qrcode(0, level);
  qr.addData(value);
  qr.make();
  return qr.getModuleCount();
}

// The colours the dots are drawn in (two when a gradient is on).
export function foregroundColors(settings) {
  return settings.useGradient ? [settings.fgColor, settings.gradientColor] : [settings.fgColor];
}

// Checks settings that might make the QR code hard to scan.
// Each warning has a level: "error" (likely to fail) or "warn" (may fail).
export function getScanWarnings(settings, value) {
  if (!value) return [];
  const warnings = [];
  const colors = foregroundColors(settings);

  // The weakest colour pair decides how readable the code is.
  const worst = Math.min(...colors.map((c) => contrastRatio(c, settings.bgColor)));
  if (worst < 3) {
    warnings.push({ level: "error", text: `Very low contrast (${worst.toFixed(1)}:1). Most scanners will fail. Use darker dots or a lighter background.` });
  } else if (worst < 4.5) {
    warnings.push({ level: "warn", text: `Low contrast (${worst.toFixed(1)}:1). Some scanners may struggle. Aim for at least 4.5:1.` });
  }

  if (colors.some((c) => luminance(c) > luminance(settings.bgColor))) {
    warnings.push({ level: "error", text: "Dots are lighter than the background (inverted). Many scanner apps cannot read inverted codes." });
  }

  if (settings.margin < 2) {
    warnings.push({ level: "error", text: "Quiet zone is almost gone. Scanners need a blank border to find the code; 4 is recommended." });
  } else if (settings.margin < 4) {
    warnings.push({ level: "warn", text: "Quiet zone is below the recommended 4 modules. It may fail on busy backgrounds." });
  }

  const modules = getModuleCount(value, settings.level);
  const cellPx = settings.size / (modules + 2 * settings.margin);
  if (cellPx < 3) {
    warnings.push({ level: "error", text: `Each square is only ${cellPx.toFixed(1)}px. Increase the size or shorten the content.` });
  } else if (settings.size < 160) {
    warnings.push({ level: "warn", text: "Small size. The code may be hard to scan when printed or shown on a screen." });
  }

  if (settings.logo) {
    if (settings.level === "L" || settings.level === "M") {
      warnings.push({ level: "error", text: "A logo covers part of the code. Use error correction Q or H so the hidden part can be recovered." });
    } else if (settings.logoSize > 0.4) {
      warnings.push({ level: "warn", text: "The logo is large. Keep it under 40% of the width for reliable scans." });
    }
  }

  return warnings;
}

// Converts our settings into the options object the qr-code-styling library expects.
export function toStylingOptions(settings, value) {
  const modules = getModuleCount(value, settings.level);
  // The library takes the margin in pixels, so convert modules to pixels.
  const cellPx = settings.size / (modules + 2 * settings.margin);
  const color = settings.fgColor;
  const gradient = settings.useGradient
    ? {
        type: settings.gradientType,
        rotation: (settings.gradientRotation * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: settings.fgColor },
          { offset: 1, color: settings.gradientColor },
        ],
      }
    : undefined;

  return {
    width: settings.size,
    height: settings.size,
    type: "canvas",
    data: value,
    margin: Math.round(cellPx * settings.margin),
    image: settings.logo || undefined,
    qrOptions: { errorCorrectionLevel: settings.level },
    dotsOptions: { type: settings.dotType, color, gradient },
    cornersSquareOptions: { type: settings.cornerSquareType, color, gradient },
    cornersDotOptions: { type: settings.cornerDotType, color, gradient },
    backgroundOptions: { color: settings.bgColor },
    imageOptions: { hideBackgroundDots: true, imageSize: settings.logoSize, margin: 4, crossOrigin: "anonymous" },
  };
}
