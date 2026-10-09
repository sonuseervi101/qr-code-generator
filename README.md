# QR Studio – QR Code Generator & Designer

![CI](https://github.com/sonuseervi101/qr-code-generator/actions/workflows/ci.yml/badge.svg)

Design QR codes that look good **and still scan**. Create 10 kinds of QR codes, style them, verify they scan, read existing codes with your camera, and generate hundreds at once. Everything runs in the browser with no backend.

Built for the **GDG on Campus SRM Recruitments 2026-27 (Technical Domain – Frontend Task 1)**.

**Live demo:** https://qr-code-generator-beta-gilt.vercel.app

## Screenshots

### Desktop
![Desktop view](screenshots/desktop.png)

### Wi-Fi QR code
![Wi-Fi QR code](screenshots/wifi.png)

### Input validation
![Validation errors](screenshots/validation.png)

### Scan reliability warnings
![Scan warnings](screenshots/warnings.png)

### Mobile
![Mobile view](screenshots/mobile.png)

## Features

### Required
- **5 QR types** with their own inputs: URL, Plain Text, Email (address, subject, message), Phone, Wi-Fi (SSID, password, security, hidden network)
- **Live preview** that updates on every change
- **Customization:** size, dot and background colours, error-correction level, quiet zone (margin)
- **6 presets** (Classic, Google, Midnight, Sunset, Forest, Print); everything stays editable after picking one
- **PNG download** generated from the same renderer as the preview, so it matches exactly
- **Validation** with clear error messages; no code is generated from invalid input
- **Scan-reliability warnings** for low contrast, inverted colours, small quiet zone, tiny modules and logos without enough error correction
- **Recent codes** saved in `localStorage` with thumbnails; they survive a refresh and can be reloaded or deleted
- **Responsive layout:** two columns on desktop, preview-first single column on mobile

### Beyond the brief
- **10 QR types:** the 5 required ones plus **UPI payment** (opens GPay/PhonePe/Paytm/BHIM), **Contact card** (vCard), **WhatsApp** message, **SMS** and **Location** (with "Use my current location")
- **Scanner mode:** read any QR code with the camera, an uploaded photo, drag-and-drop or a pasted screenshot. The result is recognised by type and can be opened, copied, or loaded into the editor to restyle it.
- **Bulk mode:** paste a list or upload a CSV (`name,content`), and download every code in your current design as one ZIP, with an `index.csv` mapping files to content. Progress bar, row validation and a 200-row limit.
- **Shareable links:** "Copy link" stores the type, content and design in the link after `#`, which browsers never send to a server. Opening the link recreates the exact code.
- **Continuous integration:** GitHub Actions runs lint, tests and a build on every push (badge above).

### Optional enhancements
- **Built-in scan verification:** after every change the app renders the code to pixels and decodes it with a real QR reader ([jsQR](https://github.com/cozmo/jsQR)). The badge shows *Scan verified* or *Scan failed*.
- **Custom patterns:** 6 dot styles and separate corner frame / corner centre styles
- **Gradient codes:** linear or radial, with adjustable angle
- **Logo in the centre:** uploaded images are resized to 256 px; adding a logo raises error correction to High automatically
- **SVG download, copy to clipboard and native share** (on supported devices)
- **Light / dark / auto theme**, remembered across visits
- **40 automated tests** (Vitest), including round-trip tests that build every QR type, decode it, and check the result rebuilds identically
- Scan and Bulk modes are lazy-loaded, so the first page load stays small
- Accessibility: keyboard focus outlines, ARIA roles for tabs and option groups, live region for status messages, reduced-motion support

## Tech Stack

- React 19 + Vite
- JavaScript, CSS (custom properties for theming, no UI framework)
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) for styled rendering
- [jsQR](https://github.com/cozmo/jsQR) for scan verification and the scanner
- [JSZip](https://stuk.github.io/jszip/) for bulk downloads
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) to measure the code's module count
- Vitest for unit tests, ESLint for linting
- Deployed on Vercel

## Project Structure

```
src/
├── App.jsx                 # Holds state and connects the panels
├── components/
│   ├── ContentForm.jsx     # Type tabs and per-type input fields
│   ├── StylePanel.jsx      # Presets, pattern, colours, logo, size and reliability
│   ├── QrPreview.jsx       # Rendering, scan verification, download/copy/share/link
│   ├── RecentList.jsx      # Saved codes
│   ├── ScanPanel.jsx       # Camera / image / paste scanner
│   └── BulkPanel.jsx       # List or CSV to ZIP
├── hooks/
│   ├── useLocalStorage.js  # useState that persists to localStorage
│   └── useTheme.js         # Light / dark / auto theme
└── utils/
    ├── constants.js        # Types, defaults, presets
    ├── qr.js               # Pure logic: formats, validation, contrast, warnings
    ├── parse.js            # Scanned text back to type + fields
    ├── bulk.js             # Parses bulk lists and CSV
    ├── share.js            # Encodes/decodes shareable links
    ├── *.test.js           # Unit tests
    └── image.js            # Logo resizing and image helpers
.github/workflows/ci.yml    # Lint, test and build on every push
```

UI components only display data and report user actions. All decisions (what text goes into the code, whether it is valid, whether it will scan) live in `utils/qr.js` as pure functions, which is why they can be unit-tested without a browser.

## How It Works

**Content formats.** Each type is converted into the format phone scanners understand:

| Type | Format |
|---|---|
| URL | `https://example.com` |
| Text | the text as-is |
| Email | `mailto:name@example.com?subject=...&body=...` (URL-encoded) |
| Phone | `tel:+919876543210` (spaces and dashes removed) |
| Wi-Fi | `WIFI:T:WPA;S:Name;P:password;;` (`\ ; , : "` escaped) |
| UPI | `upi://pay?pa=name@bank&pn=Name&am=150.00&cu=INR&tn=Note` |
| Contact | vCard 3.0 (`BEGIN:VCARD` … `END:VCARD`) |
| WhatsApp | `https://wa.me/919876543210?text=...` |
| SMS | `SMSTO:+919876543210:message` |
| Location | `geo:12.823,80.0444?q=12.823,80.0444(Place)` |

**Contrast.** Uses the WCAG relative-luminance formula. With a gradient, both colours are checked and the weaker one decides. Below 3:1 is an error, below 4.5:1 a warning.

**Quiet zone.** Measured in modules (QR squares), as in the QR specification, where 4 is recommended. The app counts the modules for the current content and converts the margin to pixels for the renderer.

**Error correction.** L/M/Q/H recover 7/15/25/30% damage. A logo covers part of the code, so Q or H is required when one is added.

**Scan verification.** The PNG is decoded with jsQR using `dontInvert`, which behaves like most phone camera apps (they don't read light-on-dark codes). The check is debounced by 350 ms so it doesn't run on every keystroke.

**Scanner.** Camera frames are drawn onto a canvas and passed to jsQR on every animation frame until a code is found; the camera is then stopped. `parse.js` is the reverse of `buildQrValue`: it recognises the format (UPI, vCard, Wi-Fi with escapes, etc.) and fills the editor's fields.

**Shareable links.** The state is turned into JSON, encoded as UTF-8 bytes, then base64url, so any language or emoji survives. Broken links are ignored safely. Logos are left out because images are too large for a URL.

**Persistence.** `useLocalStorage` loads saved codes once at start-up and writes them whenever they change. Uploaded logos are shrunk before saving, and storage errors are caught so the app keeps working if storage is full or blocked.

## Run Locally

```bash
git clone https://github.com/sonuseervi101/qr-code-generator.git
cd qr-code-generator
npm install
npm run dev     # start at http://localhost:5173
npm test        # run unit tests
```

## Testing

**Automated (40 tests, `npm test`, also run by GitHub Actions on every push):** every QR format and its invalid inputs, Wi-Fi/vCard escaping, build → decode → rebuild round trips for all 10 types, share-link encoding (including emoji and broken links), bulk/CSV parsing, contrast ratio and every scan warning.

**Manual:**
- Scanned every type with a phone camera (URL opens the site, Email opens a draft, Phone opens the dialer, Wi-Fi offers to join)
- Every preset, dot style and gradient checked with the scan badge and a phone
- Downloaded PNG and SVG files open correctly and match the preview
- Logo upload with different images; error correction raised automatically
- Recent codes remain after refresh and reload correctly
- Scanner: camera, uploaded photo, drag-and-drop and pasted screenshot
- Bulk: sample list and CSV upload; ZIP contents checked
- Share links reopen the same code in a new tab
- Light, dark and auto themes
- Layout checked at desktop and phone sizes with Chrome DevTools

## Author

Sonu – [GitHub](https://github.com/sonuseervi101) · [LinkedIn](https://www.linkedin.com/in/sonu-seervi-330070399)