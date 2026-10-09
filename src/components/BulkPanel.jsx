import { useMemo, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import JSZip from "jszip";
import { parseBulkInput } from "../utils/bulk";
import { toStylingOptions } from "../utils/qr";

const SAMPLE = `Google Developers,https://developers.google.com
GDG SRM,https://gdgsrm.com
Wi-Fi help desk,"Ask at the front desk, room 101"`;

// Generates many QR codes at once, in the current design, and downloads them as a ZIP.
export default function BulkPanel({ settings, onNotify }) {
  const [input, setInput] = useState("");
  const [namedRows, setNamedRows] = useState(true);
  const [progress, setProgress] = useState(null); // null, or { done, total }
  const fileRef = useRef(null);

  // Re-parse only when the text or the option changes.
  const { rows, problems } = useMemo(() => parseBulkInput(input, namedRows), [input, namedRows]);
  const busy = progress !== null;

  async function loadFile(file) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      onNotify("File is too large (max 1 MB).");
      return;
    }
    setInput(await file.text());
  }

  async function generateZip() {
    const zip = new JSZip();
    const folder = zip.folder("qr-codes");
    const index = ["file,content"];
    setProgress({ done: 0, total: rows.length });
    try {
      for (let i = 0; i < rows.length; i++) {
        const { fileName, content } = rows[i];
        const qr = new QRCodeStyling(toStylingOptions(settings, content));
        folder.file(`${fileName}.png`, await qr.getRawData("png"));
        index.push(`${fileName}.png,"${content.replace(/"/g, '""')}"`);
        setProgress({ done: i + 1, total: rows.length });
        // Give the browser a moment to repaint the progress bar.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      folder.file("index.csv", index.join("\n"));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "qr-codes.zip";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onNotify(`Downloaded ${rows.length} QR codes.`);
    } catch {
      onNotify("Something went wrong while creating the ZIP.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="scan-layout">
      <section className="card">
        <div className="card-head">
          <h2>Bulk generate</h2>
          <button type="button" className="text-btn" onClick={() => { setNamedRows(true); setInput(SAMPLE); }}>
            Try a sample
          </button>
        </div>
        <p className="muted">
          One QR code per line. Useful for event passes, product labels or table cards. Every code uses your current design from the Create tab.
        </p>

        <label className="check spaced">
          <input type="checkbox" checked={namedRows} onChange={(e) => setNamedRows(e.target.checked)} />
          Each line is <code>name,content</code> (CSV)
        </label>

        <label className="field">
          <span className="field-label">
            {namedRows ? "name,content" : "Content"}
            <span className="hint">{rows.length} codes</span>
          </span>
          <textarea
            rows="9"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={namedRows ? "Ravi,https://example.com/ravi\nPriya,https://example.com/priya" : "https://example.com/1\nhttps://example.com/2"}
            className="mono"
          />
        </label>

        <div className="actions">
          <button type="button" className="btn primary" onClick={generateZip} disabled={!rows.length || busy}>
            {busy ? `Creating ${progress.done}/${progress.total}…` : `Download ${rows.length || ""} as ZIP`}
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current.click()} disabled={busy}>
            Upload CSV / TXT
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={(e) => { loadFile(e.target.files[0]); e.target.value = ""; }} />
        </div>

        {busy && (
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
            <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
        )}

        {problems.length > 0 && (
          <ul className="warnings">
            {problems.slice(0, 5).map((p) => (
              <li key={p} className="warn">{p}</li>
            ))}
            {problems.length > 5 && <li className="warn">…and {problems.length - 5} more.</li>}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Files in the ZIP</h2>
        </div>
        {rows.length === 0 ? (
          <p className="muted">Your list will appear here. The ZIP also includes an index.csv that maps each file to its content.</p>
        ) : (
          <ol className="bulk-list">
            {rows.slice(0, 50).map((r) => (
              <li key={r.fileName}>
                <code>{r.fileName}.png</code>
                <span>{r.content}</span>
              </li>
            ))}
            {rows.length > 50 && <li className="muted">…and {rows.length - 50} more</li>}
          </ol>
        )}
      </section>
    </div>
  );
}
