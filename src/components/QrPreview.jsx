import { useEffect, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import jsQR from "jsqr";
import { toStylingOptions } from "../utils/qr";
import { blobToDataUrl, blobToImageData } from "../utils/image";

// Shows the live QR code, checks that it really scans, and handles download/copy/share.
export default function QrPreview({ value, settings, warnings, fileName, onSave, onCopyLink, onNotify }) {
  const containerRef = useRef(null);
  const qrRef = useRef(null); // the current QRCodeStyling instance
  const [scan, setScan] = useState("idle"); // idle | checking | ok | fail

  // Redraw whenever the content or the design changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!value || !container) {
      qrRef.current = null;
      return;
    }
    const qr = new QRCodeStyling(toStylingOptions(settings, value));
    container.innerHTML = "";
    qr.append(container);
    qrRef.current = qr;

    // Built-in scan test: render the code to pixels and try to read it back with jsQR,
    // a real QR decoder. Wait a moment so we don't run it on every keystroke.
    let cancelled = false;
    setScan("checking");
    const timer = setTimeout(async () => {
      try {
        const blob = await qr.getRawData("png");
        const pixels = await blobToImageData(blob);
        // "dontInvert" mimics typical phone scanners, which don't read light-on-dark codes.
        const result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "dontInvert" });
        if (!cancelled) setScan(result && result.data === value ? "ok" : "fail");
      } catch {
        if (!cancelled) setScan("fail");
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, settings]);

  async function download(extension) {
    if (!qrRef.current) return;
    await qrRef.current.download({ name: fileName, extension });
    onNotify(`${extension.toUpperCase()} downloaded.`);
    save(false);
  }

  async function pngBlob() {
    return qrRef.current.getRawData("png");
  }

  async function copyImage() {
    try {
      const blob = await pngBlob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      onNotify("QR code copied to clipboard.");
    } catch {
      onNotify("Your browser doesn't allow copying images here. Use Download instead.");
    }
  }

  async function share() {
    try {
      const blob = await pngBlob();
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      await navigator.share({ files: [file], title: "QR code" });
    } catch (err) {
      if (err?.name !== "AbortError") onNotify("Sharing isn't available here. Use Download instead.");
    }
  }

  // Saves to the recent list with a small thumbnail image.
  async function save(announce = true) {
    if (!value) return;
    try {
      const thumbOptions = { ...toStylingOptions({ ...settings, size: 96 }, value) };
      const blob = await new QRCodeStyling(thumbOptions).getRawData("png");
      onSave(await blobToDataUrl(blob));
      if (announce) onNotify("Saved to recent.");
    } catch {
      onNotify("Couldn't save this one to recent.");
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.canShare === "function";
  const hasErrors = warnings.some((w) => w.level === "error");

  return (
    <section className="card preview-card">
      <div className="card-head">
        <span className="step">3</span>
        <h2>Preview</h2>
        {value && <ScanBadge scan={scan} />}
      </div>

      <div className="stage">
        {value ? (
          <div  key="qr" ref={containerRef} className="qr-canvas" aria-label="QR code preview" role="img" />
        ) : (
          <div  key="empty" className="empty-stage">
            <div className="ghost-qr" aria-hidden="true" />
            <p>Fill in the content to see your QR code.</p>
          </div>
        )}
      </div>

      {value && warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w.text} className={w.level}>
              {w.text}
            </li>
          ))}
        </ul>
      )}
      {value && warnings.length === 0 && scan === "ok" && <p className="all-good">Good contrast, quiet zone and size. Ready to use.</p>}

      <div className="actions">
        <button type="button" className="btn primary" onClick={() => download("png")} disabled={!value}>
          Download PNG
        </button>
        <button type="button" className="btn" onClick={() => download("svg")} disabled={!value}>
          SVG
        </button>
        <button type="button" className="btn" onClick={copyImage} disabled={!value}>
          Copy
        </button>
        {canShare && (
          <button type="button" className="btn" onClick={share} disabled={!value}>
            Share
          </button>
        )}
        <button type="button" className="btn" onClick={() => save(true)} disabled={!value}>
          Save
        </button>
        <button type="button" className="btn" onClick={onCopyLink} disabled={!value}>
          Copy link
        </button>
      </div>
      {value && hasErrors && <p className="fine-print">Fix the red warnings before printing this code.</p>}
    </section>
  );
}

function ScanBadge({ scan }) {
  const text = {
    idle: "",
    checking: "Testing scan…",
    ok: "✓ Scan verified",
    fail: "✕ Scan failed",
  }[scan];
  if (!text) return null;
  return (
    <span className={`badge ${scan}`} role="status" title="The app decodes its own image with a real QR reader (jsQR) to check it scans.">
      {text}
    </span>
  );
}
