import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import "./App.css";

// ---------- Constants ----------
const QR_TYPES = [
  { id: "url", label: "URL" },
  { id: "text", label: "Text" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "wifi", label: "Wi-Fi" },
];

const DEFAULT_DATA = {
  url: "https://gdgsrm.com",
  text: "",
  email: "",
  subject: "",
  body: "",
  phone: "",
  ssid: "",
  password: "",
  security: "WPA",
  hidden: false,
};

const DEFAULT_SETTINGS = {
  size: 256,
  fgColor: "#000000",
  bgColor: "#ffffff",
  level: "M",
  margin: 4,
};

const PRESETS = [
  { name: "Classic", fgColor: "#000000", bgColor: "#ffffff", level: "M", margin: 4 },
  { name: "Google Blue", fgColor: "#1a73e8", bgColor: "#ffffff", level: "M", margin: 4 },
  { name: "Forest", fgColor: "#1e5631", bgColor: "#f1f8e9", level: "Q", margin: 4 },
  { name: "Berry", fgColor: "#6a1b4d", bgColor: "#fff5f8", level: "Q", margin: 4 },
  { name: "Print Ready", fgColor: "#000000", bgColor: "#ffffff", level: "H", margin: 6 },
];

const STORAGE_KEY = "qr-recent";
const MAX_RECENT = 8;

// ---------- Helper functions ----------

// Wi-Fi QR format needs \ ; , : " escaped with a backslash
function escapeWifi(value) {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

// Turns the form data into the text stored inside the QR code.
// Returns { value } when valid, or { error } when not.
function buildQrValue(type, data) {
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Enter a valid email address, like name@example.com" };
    }
    const params = [];
    if (data.subject.trim()) params.push("subject=" + encodeURIComponent(data.subject.trim()));
    if (data.body.trim()) params.push("body=" + encodeURIComponent(data.body.trim()));
    return { value: "mailto:" + email + (params.length ? "?" + params.join("&") : "") };
  }

  if (type === "phone") {
    const phone = data.phone.replace(/[\s-]/g, "");
    if (!phone) return { error: "Enter a phone number." };
    if (!/^\+?[0-9]{7,15}$/.test(phone)) {
      return { error: "Phone number should have 7–15 digits and may start with +" };
    }
    return { value: "tel:" + phone };
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

  return { error: "Unknown QR type." };
}

// Relative brightness of a color (0 = black, 1 = white), WCAG formula
function luminance(hex) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = rgb.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Checks settings that might make the QR code hard to scan
function getScanWarnings(settings, value) {
  const warnings = [];
  const ratio = contrastRatio(settings.fgColor, settings.bgColor);

  if (ratio < 3) {
    warnings.push(`Very low contrast (${ratio.toFixed(1)}:1). Most scanners will fail. Use a darker foreground or lighter background.`);
  } else if (ratio < 4.5) {
    warnings.push(`Low contrast (${ratio.toFixed(1)}:1). Some scanners may struggle. Aim for at least 4.5:1.`);
  }
  if (luminance(settings.fgColor) > luminance(settings.bgColor)) {
    warnings.push("Foreground is lighter than background (inverted). Many scanner apps can't read inverted QR codes.");
  }
  if (settings.margin < 2) {
    warnings.push("Margin is very small. Scanners need a blank border to find the code. 4 is recommended.");
  } else if (settings.margin < 4) {
    warnings.push("Margin is below the recommended 4. It may not scan when placed on a busy background.");
  }
  if (settings.size < 128) {
    warnings.push("Small size. The code may be hard to scan when printed or shown on screen.");
  }
  if (value && value.length > 300 && settings.size < 256) {
    warnings.push("Lots of data in a small code makes the dots tiny. Increase the size.");
  }
  return warnings;
}

function loadRecent() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// ---------- Main component ----------
function App() {
  const [type, setType] = useState("url");
  const [data, setData] = useState(DEFAULT_DATA);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [recent, setRecent] = useState(loadRecent);
  const [message, setMessage] = useState("");

  const canvasRef = useRef(null);
  const svgRef = useRef(null);

  const { value, error } = buildQrValue(type, data);
  const warnings = getScanWarnings(settings, value);

  // Save recent QR codes whenever the list changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    } catch {
      // Storage full or blocked; the app still works without saving
    }
  }, [recent]);

  // Hide the status message after 2.5 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [message]);

  function updateData(field, newValue) {
    setData((prev) => ({ ...prev, [field]: newValue }));
  }

  function updateSetting(field, newValue) {
    setSettings((prev) => ({ ...prev, [field]: newValue }));
  }

  function applyPreset(preset) {
    setSettings((prev) => ({
      ...prev,
      fgColor: preset.fgColor,
      bgColor: preset.bgColor,
      level: preset.level,
      margin: preset.margin,
    }));
  }

  function saveToRecent() {
    if (!value) return;
    const entry = { id: Date.now(), type, data, settings, value };
    setRecent((prev) => {
      // Remove an identical older entry so it moves to the top
      const withoutDuplicate = prev.filter(
        (item) => !(item.value === value && JSON.stringify(item.settings) === JSON.stringify(settings))
      );
      return [entry, ...withoutDuplicate].slice(0, MAX_RECENT);
    });
  }

  function triggerDownload(href, filename) {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
  }

  function downloadPng() {
    if (!value || !canvasRef.current) return;
    triggerDownload(canvasRef.current.toDataURL("image/png"), `qr-${type}.png`);
    saveToRecent();
    setMessage("PNG downloaded and saved to recent.");
  }

  function downloadSvg() {
    if (!value || !svgRef.current) return;
    const svgText = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `qr-${type}.svg`);
    URL.revokeObjectURL(url);
    saveToRecent();
    setMessage("SVG downloaded and saved to recent.");
  }

  function copyToClipboard() {
    if (!value || !canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setMessage("QR code copied to clipboard.");
      } catch {
        setMessage("Your browser doesn't allow copying images. Use Download instead.");
      }
    });
  }

  function reuseRecent(item) {
    setType(item.type);
    setData({ ...DEFAULT_DATA, ...item.data });
    setSettings({ ...DEFAULT_SETTINGS, ...item.settings });
    setMessage("Loaded from recent.");
  }

  function deleteRecent(id) {
    setRecent((prev) => prev.filter((item) => item.id !== id));
  }

  function describe(item) {
    const label = QR_TYPES.find((t) => t.id === item.type)?.label ?? item.type;
    const d = item.data;
    const detail =
      item.type === "url" ? d.url
      : item.type === "text" ? d.text
      : item.type === "email" ? d.email
      : item.type === "phone" ? d.phone
      : d.ssid;
    return { label, detail };
  }

  return (
    <div className="app">
      <header className="header">
        <h1>QR Code Generator</h1>
        <p>Create, style and download QR codes. Everything runs in your browser.</p>
      </header>

      <main className="layout">
        {/* ---------- Left: controls ---------- */}
        <section className="controls">
          <div className="panel">
            <h2>Content</h2>
            <div className="type-tabs" role="tablist">
              {QR_TYPES.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={type === t.id}
                  className={type === t.id ? "tab active" : "tab"}
                  onClick={() => setType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {type === "url" && (
              <label className="field">
                Website URL
                <input
                  type="url"
                  value={data.url}
                  onChange={(e) => updateData("url", e.target.value)}
                  placeholder="https://example.com"
                />
              </label>
            )}

            {type === "text" && (
              <label className="field">
                Text
                <textarea
                  rows="4"
                  value={data.text}
                  onChange={(e) => updateData("text", e.target.value)}
                  placeholder="Type any message"
                />
                <span className="hint">{data.text.length}/1000</span>
              </label>
            )}

            {type === "email" && (
              <>
                <label className="field">
                  Email address
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => updateData("email", e.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
                <label className="field">
                  Subject (optional)
                  <input
                    type="text"
                    value={data.subject}
                    onChange={(e) => updateData("subject", e.target.value)}
                  />
                </label>
                <label className="field">
                  Message (optional)
                  <textarea
                    rows="3"
                    value={data.body}
                    onChange={(e) => updateData("body", e.target.value)}
                  />
                </label>
              </>
            )}

            {type === "phone" && (
              <label className="field">
                Phone number
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => updateData("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </label>
            )}

            {type === "wifi" && (
              <>
                <label className="field">
                  Network name (SSID)
                  <input
                    type="text"
                    value={data.ssid}
                    onChange={(e) => updateData("ssid", e.target.value)}
                    placeholder="MyHomeWiFi"
                  />
                </label>
                <label className="field">
                  Security
                  <select
                    value={data.security}
                    onChange={(e) => updateData("security", e.target.value)}
                  >
                    <option value="WPA">WPA/WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">No password</option>
                  </select>
                </label>
                {data.security !== "nopass" && (
                  <label className="field">
                    Password
                    <input
                      type="text"
                      value={data.password}
                      onChange={(e) => updateData("password", e.target.value)}
                    />
                  </label>
                )}
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={data.hidden}
                    onChange={(e) => updateData("hidden", e.target.checked)}
                  />
                  Hidden network
                </label>
              </>
            )}

            {error && <p className="error" role="alert">{error}</p>}
          </div>

          <div className="panel">
            <h2>Presets</h2>
            <div className="presets">
              {PRESETS.map((p) => (
                <button key={p.name} className="preset" onClick={() => applyPreset(p)}>
                  <span
                    className="swatch"
                    style={{ background: p.bgColor, borderColor: p.fgColor }}
                  >
                    <span style={{ background: p.fgColor }} />
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>Style</h2>
            <label className="field">
              Size: {settings.size}px
              <input
                type="range"
                min="96"
                max="512"
                step="16"
                value={settings.size}
                onChange={(e) => updateSetting("size", Number(e.target.value))}
              />
            </label>

            <div className="color-row">
              <label className="field">
                Foreground
                <input
                  type="color"
                  value={settings.fgColor}
                  onChange={(e) => updateSetting("fgColor", e.target.value)}
                />
              </label>
              <label className="field">
                Background
                <input
                  type="color"
                  value={settings.bgColor}
                  onChange={(e) => updateSetting("bgColor", e.target.value)}
                />
              </label>
            </div>

            <label className="field">
              Error correction
              <select
                value={settings.level}
                onChange={(e) => updateSetting("level", e.target.value)}
              >
                <option value="L">Low (7% damage can be recovered)</option>
                <option value="M">Medium (15%)</option>
                <option value="Q">Quartile (25%)</option>
                <option value="H">High (30%)</option>
              </select>
            </label>

            <label className="field">
              Margin: {settings.margin}
              <input
                type="range"
                min="0"
                max="10"
                value={settings.margin}
                onChange={(e) => updateSetting("margin", Number(e.target.value))}
              />
            </label>

            <button className="link-button" onClick={() => setSettings(DEFAULT_SETTINGS)}>
              Reset style
            </button>
          </div>
        </section>

        {/* ---------- Right: preview ---------- */}
        <section className="preview-column">
          <div className="panel preview">
            <div className="qr-box">
              {value ? (
                <QRCodeCanvas
                  ref={canvasRef}
                  value={value}
                  size={settings.size}
                  fgColor={settings.fgColor}
                  bgColor={settings.bgColor}
                  level={settings.level}
                  marginSize={settings.margin}
                />
              ) : (
                <p className="empty">Fill in the details to see your QR code.</p>
              )}
            </div>

            {/* Hidden SVG version, used only for SVG download */}
            {value && (
              <div hidden>
                <QRCodeSVG
                  ref={svgRef}
                  value={value}
                  size={settings.size}
                  fgColor={settings.fgColor}
                  bgColor={settings.bgColor}
                  level={settings.level}
                  marginSize={settings.margin}
                />
              </div>
            )}

            {value && warnings.length > 0 && (
              <ul className="warnings">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            {value && warnings.length === 0 && (
              <p className="ok">Looks good. This code should scan reliably.</p>
            )}

            <div className="actions">
              <button className="primary" onClick={downloadPng} disabled={!value}>
                Download PNG
              </button>
              <button onClick={downloadSvg} disabled={!value}>
                Download SVG
              </button>
              <button onClick={copyToClipboard} disabled={!value}>
                Copy
              </button>
              <button onClick={saveToRecent} disabled={!value}>
                Save to recent
              </button>
            </div>
            <p className="status" aria-live="polite">{message}</p>
          </div>

          <div className="panel">
            <div className="recent-header">
              <h2>Recent</h2>
              {recent.length > 0 && (
                <button className="link-button" onClick={() => setRecent([])}>
                  Clear all
                </button>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="empty">Downloaded or saved codes appear here, even after you refresh.</p>
            ) : (
              <ul className="recent-list">
                {recent.map((item) => {
                  const { label, detail } = describe(item);
                  return (
                    <li key={item.id}>
                      <button className="recent-item" onClick={() => reuseRecent(item)}>
                        <QRCodeCanvas
                          value={item.value}
                          size={48}
                          fgColor={item.settings.fgColor}
                          bgColor={item.settings.bgColor}
                          marginSize={1}
                        />
                        <span>
                          <strong>{label}</strong>
                          <small>{detail}</small>
                        </span>
                      </button>
                      <button
                        className="delete"
                        aria-label="Delete from recent"
                        onClick={() => deleteRecent(item.id)}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;