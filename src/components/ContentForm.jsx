import { useState } from "react";
import { QR_TYPES } from "../utils/constants";

// The "what goes inside the QR code" panel. Shows different fields for each type.
export default function ContentForm({ type, onTypeChange, data, onChange, error }) {
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  // Fills latitude/longitude from the device's GPS (the browser asks for permission).
  function fillMyLocation() {
    if (!navigator.geolocation) {
      setLocateError("Location isn't supported in this browser.");
      return;
    }
    setLocating(true);
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange("lat", pos.coords.latitude.toFixed(6));
        onChange("lng", pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setLocateError("Couldn't get your location. Allow location access or type the coordinates.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <section className="card">
      <div className="card-head">
        <span className="step">1</span>
        <h2>Content</h2>
      </div>

      <div className="type-grid" role="tablist" aria-label="QR code type">
        {QR_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={type === t.id}
            className={type === t.id ? "active" : ""}
            onClick={() => onTypeChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {type === "url" && (
        <Field label="Website URL">
          <input type="url" value={data.url} onChange={(e) => onChange("url", e.target.value)} placeholder="https://example.com" />
        </Field>
      )}

      {type === "text" && (
        <Field label="Text" hint={`${data.text.length}/1000`}>
          <textarea rows="4" value={data.text} onChange={(e) => onChange("text", e.target.value)} placeholder="Type any message" />
        </Field>
      )}

      {type === "email" && (
        <>
          <Field label="Email address">
            <input type="email" value={data.email} onChange={(e) => onChange("email", e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field label="Subject (optional)">
            <input type="text" value={data.subject} onChange={(e) => onChange("subject", e.target.value)} />
          </Field>
          <Field label="Message (optional)">
            <textarea rows="3" value={data.body} onChange={(e) => onChange("body", e.target.value)} />
          </Field>
        </>
      )}

      {type === "phone" && (
        <Field label="Phone number">
          <input type="tel" value={data.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="+91 98765 43210" />
        </Field>
      )}

      {type === "wifi" && (
        <>
          <Field label="Network name (SSID)">
            <input type="text" value={data.ssid} onChange={(e) => onChange("ssid", e.target.value)} placeholder="MyHomeWiFi" />
          </Field>
          <div className="row-2">
            <Field label="Security">
              <select value={data.security} onChange={(e) => onChange("security", e.target.value)}>
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">No password</option>
              </select>
            </Field>
            {data.security !== "nopass" && (
              <Field label="Password">
                <input type="text" value={data.password} onChange={(e) => onChange("password", e.target.value)} />
              </Field>
            )}
          </div>
          <label className="check">
            <input type="checkbox" checked={data.hidden} onChange={(e) => onChange("hidden", e.target.checked)} />
            Hidden network
          </label>
        </>
      )}

      {type === "upi" && (
        <>
          <Field label="UPI ID">
            <input type="text" value={data.upiId} onChange={(e) => onChange("upiId", e.target.value)} placeholder="name@okaxis" autoCapitalize="off" />
          </Field>
          <Field label="Payee name">
            <input type="text" value={data.payeeName} onChange={(e) => onChange("payeeName", e.target.value)} placeholder="Name shown in the payment app" />
          </Field>
          <div className="row-2">
            <Field label="Amount in ₹ (optional)">
              <input type="text" inputMode="decimal" value={data.amount} onChange={(e) => onChange("amount", e.target.value)} placeholder="Leave empty to let the payer choose" />
            </Field>
            <Field label="Note (optional)">
              <input type="text" value={data.note} onChange={(e) => onChange("note", e.target.value)} placeholder="Club membership fee" />
            </Field>
          </div>
          <p className="muted small">Opens GPay, PhonePe, Paytm or BHIM with these details filled in.</p>
        </>
      )}

      {type === "vcard" && (
        <>
          <div className="row-2">
            <Field label="First name">
              <input type="text" value={data.firstName} onChange={(e) => onChange("firstName", e.target.value)} />
            </Field>
            <Field label="Last name">
              <input type="text" value={data.lastName} onChange={(e) => onChange("lastName", e.target.value)} />
            </Field>
          </div>
          <div className="row-2">
            <Field label="Phone">
              <input type="tel" value={data.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="+91 98765 43210" />
            </Field>
            <Field label="Email">
              <input type="email" value={data.email} onChange={(e) => onChange("email", e.target.value)} placeholder="name@example.com" />
            </Field>
          </div>
          <div className="row-2">
            <Field label="Organisation (optional)">
              <input type="text" value={data.org} onChange={(e) => onChange("org", e.target.value)} />
            </Field>
            <Field label="Website (optional)">
              <input type="url" value={data.website} onChange={(e) => onChange("website", e.target.value)} />
            </Field>
          </div>
          <p className="muted small">Scanning it offers to save a new contact. Great for event badges and visiting cards.</p>
        </>
      )}

      {(type === "whatsapp" || type === "sms") && (
        <>
          <Field label={type === "whatsapp" ? "WhatsApp number (with country code)" : "Phone number"}>
            <input type="tel" value={data.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Message (optional)" hint={`${data.message.length}/500`}>
            <textarea rows="3" value={data.message} onChange={(e) => onChange("message", e.target.value)} placeholder="Pre-filled message" />
          </Field>
        </>
      )}

      {type === "location" && (
        <>
          <div className="row-2">
            <Field label="Latitude">
              <input type="text" inputMode="decimal" value={data.lat} onChange={(e) => onChange("lat", e.target.value)} placeholder="12.823" />
            </Field>
            <Field label="Longitude">
              <input type="text" inputMode="decimal" value={data.lng} onChange={(e) => onChange("lng", e.target.value)} placeholder="80.0444" />
            </Field>
          </div>
          <Field label="Place name (optional)">
            <input type="text" value={data.placeName} onChange={(e) => onChange("placeName", e.target.value)} placeholder="SRM Tech Park" />
          </Field>
          <button type="button" className="btn" onClick={fillMyLocation} disabled={locating}>
            {locating ? "Finding you…" : "Use my current location"}
          </button>
          {locateError && <p className="field-error spaced">{locateError}</p>}
        </>
      )}

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

// A label + input pair. Reused by every field above.
function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <span className="hint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
