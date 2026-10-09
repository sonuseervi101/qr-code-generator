import { Suspense, lazy, useEffect, useState } from "react";
import ContentForm from "./components/ContentForm";
import StylePanel from "./components/StylePanel";
import QrPreview from "./components/QrPreview";
import RecentList from "./components/RecentList";
// Scan and Bulk are loaded only when opened, so the first page load stays fast.
const ScanPanel = lazy(() => import("./components/ScanPanel"));
const BulkPanel = lazy(() => import("./components/BulkPanel"));
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useTheme } from "./hooks/useTheme";
import { DEFAULT_DATA, DEFAULT_SETTINGS, MAX_RECENT, STORAGE_KEYS } from "./utils/constants";
import { buildQrValue, getScanWarnings } from "./utils/qr";
import { encodeShare, readShareFromHash } from "./utils/share";

const MODES = [
  { id: "create", label: "Create" },
  { id: "scan", label: "Scan" },
  { id: "bulk", label: "Bulk" },
];
import "./App.css";

// App holds all the state and passes it down to the panels.
export default function App() {
  // If the page was opened from a shared link, start with that code.
  const [shared] = useState(() => readShareFromHash(window.location.hash));
  const [mode, setMode] = useState("create");
  const [type, setType] = useState(shared?.type ?? "url");
  const [data, setData] = useState({ ...DEFAULT_DATA, ...shared?.data });
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...shared?.settings });
  const [recent, setRecent] = useLocalStorage(STORAGE_KEYS.recent, []);
  const [toast, setToast] = useState("");
  const [theme, cycleTheme] = useTheme();

  // Values worked out from state on every render (no extra state needed).
  const { value, error } = buildQrValue(type, data);
  const warnings = getScanWarnings(settings, value);

  // Remove the shared data from the address bar once it has been loaded.
  useEffect(() => {
    if (window.location.hash) history.replaceState(null, "", window.location.pathname);
  }, []);

  // Hide the toast message after 2.5 seconds.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  function updateData(field, newValue) {
    setData((prev) => ({ ...prev, [field]: newValue }));
  }

  function updateSetting(field, newValue) {
    setSettings((prev) => ({ ...prev, [field]: newValue }));
  }

  function applyPreset(presetSettings) {
    // Keep size and logo; a preset only changes the look.
    setSettings((prev) => ({ ...prev, ...presetSettings }));
  }

  function saveToRecent(thumb) {
    const entry = { id: Date.now(), type, data, settings, value, thumb };
    setRecent((prev) => {
      // Remove an identical older entry so it moves to the top instead of repeating.
      const rest = prev.filter((item) => !(item.value === value && JSON.stringify(item.settings) === JSON.stringify(settings)));
      return [entry, ...rest].slice(0, MAX_RECENT);
    });
  }

  function reuse(item) {
    setType(item.type);
    setData({ ...DEFAULT_DATA, ...item.data });
    setSettings({ ...DEFAULT_SETTINGS, ...item.settings });
    setToast("Loaded from recent.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyShareLink() {
    // The logo is too big for a link, so it is left out.
    const code = encodeShare({ type, data, settings: { ...settings, logo: null } });
    const link = `${window.location.origin}${window.location.pathname}#d=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setToast(settings.logo ? "Link copied (logos aren't included in links)." : "Link copied. Anyone with it sees this exact QR code.");
    } catch {
      setToast("Couldn't copy the link in this browser.");
    }
  }

  function editScanned(scannedType, scannedData) {
    setType(scannedType);
    setData(scannedData);
    setMode("create");
    setToast("Loaded into the editor. Restyle it and download.");
  }

  const themeLabel = { system: "Auto", light: "Light", dark: "Dark" }[theme];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i /><i /><i /><i />
          </span>
          <div>
            <h1>QR Studio</h1>
            <p>Design QR codes that look good and still scan.</p>
          </div>
        </div>
        <nav className="modes" aria-label="Mode">
          {MODES.map((m) => (
            <button key={m.id} type="button" className={mode === m.id ? "active" : ""} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </nav>
        <button type="button" className="btn theme-btn" onClick={cycleTheme} aria-label={`Theme: ${themeLabel}. Click to change.`}>
          Theme: {themeLabel}
        </button>
      </header>

      {mode === "create" && (
      <main className="layout">
          <div className="column">
            <ContentForm type={type} onTypeChange={setType} data={data} onChange={updateData} error={error} />
            <StylePanel
              settings={settings}
              onChange={updateSetting}
              onApplyPreset={applyPreset}
              onReset={() => setSettings(DEFAULT_SETTINGS)}
              onNotify={setToast}
            />
          </div>
  
          <div className="column sticky">
            <QrPreview
              value={value}
              settings={settings}
              warnings={warnings}
              fileName={`qr-${type}`}
              onSave={saveToRecent}
              onCopyLink={copyShareLink}
              onNotify={setToast}
            />
            <RecentList
              items={recent}
              onReuse={reuse}
              onDelete={(id) => setRecent((prev) => prev.filter((item) => item.id !== id))}
              onClear={() => setRecent([])}
            />
          </div>
        </main>
      )}
      <Suspense fallback={<p className="muted center">Loading…</p>}>
        {mode === "scan" && <ScanPanel onEdit={editScanned} onNotify={setToast} />}
        {mode === "bulk" && <BulkPanel settings={settings} onNotify={setToast} />}
      </Suspense>

      <footer className="footer">Runs entirely in your browser. Nothing you type is uploaded.</footer>

      <div className={toast ? "toast show" : "toast"} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
