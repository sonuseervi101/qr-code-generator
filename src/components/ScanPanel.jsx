import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { parseQrValue } from "../utils/parse";
import { QR_TYPES } from "../utils/constants";

// Reads QR codes from the camera, an uploaded image, or a pasted screenshot.
export default function ScanPanel({ onEdit, onNotify }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);
  const fileRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [result, setResult] = useState(null); // { text, type, data }
  const [error, setError] = useState("");

  function stopCamera() {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  // Stop the camera if the user leaves this screen.
  useEffect(() => stopCamera, []);

  function handleDecoded(text) {
    const parsed = parseQrValue(text);
    setResult({ text, ...parsed });
    setError("");
  }

  async function startCamera() {
    setError("");
    setResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't use the camera. Upload an image instead.");
      return;
    }
    try {
      // "environment" asks for the back camera on phones.
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraOn(true);
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      scanFrame();
    } catch {
      setError("Camera permission was denied or no camera was found. You can upload an image instead.");
      stopCamera();
    }
  }

  // Grab the current video frame, try to decode it, and repeat until a code is found.
  function scanFrame() {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(video, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
      if (code?.data) {
        stopCamera();
        handleDecoded(code.data);
        navigator.vibrate?.(80);
        return;
      }
    }
    frameRef.current = requestAnimationFrame(scanFrame);
  }

  async function decodeFile(file) {
    setError("");
    setResult(null);
    try {
      const text = await readQrFromFile(file);
      if (text) handleDecoded(text);
      else setError("No QR code found in that image. Try a sharper or closer picture.");
    } catch (err) {
      setError(err.message);
    }
  }

  // Ctrl+V a screenshot anywhere on this screen to scan it.
  useEffect(() => {
    function onPaste(e) {
      const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
      if (!item) return;
      readQrFromFile(item.getAsFile())
        .then((text) => {
          if (text) {
            setResult({ text, ...parseQrValue(text) });
            setError("");
          } else {
            setError("No QR code found in the pasted image.");
          }
        })
        .catch((err) => setError(err.message));
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(result.text);
      onNotify("Copied.");
    } catch {
      onNotify("Couldn't copy. Select the text and copy it manually.");
    }
  }

  const typeLabel = result && QR_TYPES.find((t) => t.id === result.type)?.label;
  const openable = result && /^(https?:|mailto:|tel:|upi:|geo:|smsto:)/i.test(result.text);

  return (
    <div className="scan-layout">
      <section className="card">
        <div className="card-head">
          <h2>Scan a QR code</h2>
        </div>
        <p className="muted">Use your camera, upload a photo, drop an image here, or press Ctrl+V to paste a screenshot.</p>

        <div
          className={`scan-stage ${cameraOn ? "live" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            decodeFile(e.dataTransfer.files[0]);
          }}
        >
          <video ref={videoRef} playsInline muted hidden={!cameraOn} />
          {cameraOn && <div className="scan-frame" aria-hidden="true" />}
          {!cameraOn && <p className="muted">Drop an image with a QR code here</p>}
        </div>

        <div className="actions">
          {cameraOn ? (
            <button type="button" className="btn" onClick={stopCamera}>
              Stop camera
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={startCamera}>
              Use camera
            </button>
          )}
          <button type="button" className="btn" onClick={() => fileRef.current.click()}>
            Upload image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              decodeFile(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </div>
        {error && <p className="field-error spaced">{error}</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Result</h2>
          {result && <span className="badge ok">{typeLabel}</span>}
        </div>
        {result ? (
          <>
            <pre className="scan-result">{result.text}</pre>
            <div className="actions">
              <button type="button" className="btn primary" onClick={() => onEdit(result.type, result.data)}>
                Edit &amp; restyle
              </button>
              {openable && (
                <a className="btn" href={result.text} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
              )}
              <button type="button" className="btn" onClick={copyText}>
                Copy text
              </button>
            </div>
            <p className="muted small spaced">Links open only when you click Open, so you can check them first.</p>
          </>
        ) : (
          <p className="muted">The decoded content will appear here. You can then open it, copy it, or turn it into a styled QR code.</p>
        )}
      </section>
    </div>
  );
}

// Decodes the first QR code found in an image file. Returns its text, or null if none.
async function readQrFromFile(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That image couldn't be read.");
  }
  // Large photos are scaled down: faster to decode and still accurate.
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
  return code?.data || null;
}
