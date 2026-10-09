import { useRef, useState } from "react";
import { CORNER_DOT_TYPES, CORNER_SQUARE_TYPES, DOT_TYPES, PRESETS } from "../utils/constants";
import { resizeImageFile } from "../utils/image";

// The "how it looks" panel: presets, pattern, colours, logo and size settings.
export default function StylePanel({ settings, onChange, onApplyPreset, onReset, onNotify }) {
  const fileInput = useRef(null);
  const [logoError, setLogoError] = useState("");

  async function handleLogo(e) {
    const file = e.target.files[0];
    e.target.value = ""; // allow choosing the same file again later
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file);
      setLogoError("");
      onChange("logo", dataUrl);
      // A logo hides part of the code, so raise error correction to keep it scannable.
      if (settings.level === "L" || settings.level === "M") {
        onChange("level", "H");
        onNotify("Logo added. Error correction raised to High so the code still scans.");
      } else {
        onNotify("Logo added.");
      }
    } catch (err) {
      setLogoError(err.message);
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <span className="step">2</span>
        <h2>Design</h2>
        <button type="button" className="text-btn" onClick={onReset}>
          Reset
        </button>
      </div>

      <h3 className="sub">Presets</h3>
      <div className="presets">
        {PRESETS.map((p) => {
          const s = p.settings;
          const dots = s.useGradient ? `linear-gradient(135deg, ${s.fgColor}, ${s.gradientColor})` : s.fgColor;
          return (
            <button key={p.name} type="button" className="preset" onClick={() => onApplyPreset(p.settings)}>
              <span className="preset-swatch" style={{ background: s.bgColor }}>
                <span style={{ background: dots, borderRadius: s.dotType === "square" ? 2 : 999 }} />
              </span>
              {p.name}
            </button>
          );
        })}
      </div>

      <h3 className="sub">Pattern</h3>
      <ChipGroup label="Dots" options={DOT_TYPES} value={settings.dotType} onSelect={(v) => onChange("dotType", v)} />
      <div className="row-2">
        <ChipGroup label="Corner frame" options={CORNER_SQUARE_TYPES} value={settings.cornerSquareType} onSelect={(v) => onChange("cornerSquareType", v)} />
        <ChipGroup label="Corner centre" options={CORNER_DOT_TYPES} value={settings.cornerDotType} onSelect={(v) => onChange("cornerDotType", v)} />
      </div>

      <h3 className="sub">Colours</h3>
      <div className="row-2">
        <ColorField label={settings.useGradient ? "Dots (start)" : "Dots"} value={settings.fgColor} onChange={(v) => onChange("fgColor", v)} />
        <ColorField label="Background" value={settings.bgColor} onChange={(v) => onChange("bgColor", v)} />
      </div>
      <label className="check">
        <input type="checkbox" checked={settings.useGradient} onChange={(e) => onChange("useGradient", e.target.checked)} />
        Gradient dots
      </label>
      {settings.useGradient && (
        <div className="row-3">
          <ColorField label="End colour" value={settings.gradientColor} onChange={(v) => onChange("gradientColor", v)} />
          <label className="field">
            <span className="field-label">Type</span>
            <select value={settings.gradientType} onChange={(e) => onChange("gradientType", e.target.value)}>
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
          </label>
          {settings.gradientType === "linear" && (
            <Slider label="Angle" unit="°" min={0} max={360} step={15} value={settings.gradientRotation} onChange={(v) => onChange("gradientRotation", v)} />
          )}
        </div>
      )}

      <h3 className="sub">Logo</h3>
      <div className="logo-row">
        {settings.logo ? (
          <>
            <img src={settings.logo} alt="Uploaded logo" className="logo-thumb" />
            <Slider label="Logo size" unit="%" min={15} max={50} step={1} value={Math.round(settings.logoSize * 100)} onChange={(v) => onChange("logoSize", v / 100)} />
            <button type="button" className="text-btn" onClick={() => onChange("logo", null)}>
              Remove
            </button>
          </>
        ) : (
          <button type="button" className="upload" onClick={() => fileInput.current.click()}>
            + Add a logo in the centre
          </button>
        )}
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={handleLogo} />
      </div>
      {logoError && <p className="field-error">{logoError}</p>}

      <h3 className="sub">Size &amp; reliability</h3>
      <div className="row-2">
        <Slider label="Size" unit="px" min={128} max={1024} step={16} value={settings.size} onChange={(v) => onChange("size", v)} />
        <Slider label="Quiet zone" unit=" modules" min={0} max={10} step={1} value={settings.margin} onChange={(v) => onChange("margin", v)} />
      </div>
      <label className="field">
        <span className="field-label">Error correction</span>
        <select value={settings.level} onChange={(e) => onChange("level", e.target.value)}>
          <option value="L">Low: survives 7% damage, smallest code</option>
          <option value="M">Medium: survives 15% damage</option>
          <option value="Q">Quartile: survives 25% damage</option>
          <option value="H">High: survives 30% damage (best with a logo)</option>
        </select>
      </label>
    </section>
  );
}

function ChipGroup({ label, options, value, onSelect }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="chips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? "chip active" : "chip"} onClick={() => onSelect(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="color-input">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <code>{value.toUpperCase()}</code>
      </span>
    </label>
  );
}

function Slider({ label, unit, min, max, step, value, onChange }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        <span className="hint">
          {value}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
