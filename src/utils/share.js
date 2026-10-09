// Packs the current QR (type, content and design) into the page link, so the
// link opens the exact same code. It goes after "#", a part of the URL that
// browsers never send to the server, so the content stays private.
// The logo is left out because images are too big for a link.

export function encodeShare(state) {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  // base64url: base64 without characters that have special meaning in links
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(code) {
  try {
    const base64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const state = JSON.parse(new TextDecoder().decode(bytes));
    if (!state || typeof state.type !== "string" || typeof state.data !== "object") return null;
    return state;
  } catch {
    return null; // broken or edited link: ignore it
  }
}

export function readShareFromHash(hash) {
  const match = hash.match(/^#d=([\w-]+)$/);
  return match ? decodeShare(match[1]) : null;
}
