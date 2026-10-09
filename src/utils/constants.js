// All fixed values used across the app live here, so they are easy to find and change.

export const QR_TYPES = [
  { id: "url", label: "URL" },
  { id: "text", label: "Text" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "upi", label: "UPI Pay" },
  { id: "vcard", label: "Contact" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS" },
  { id: "location", label: "Location" },
];

export const DEFAULT_DATA = {
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
  upiId: "",
  payeeName: "",
  amount: "",
  note: "",
  firstName: "",
  lastName: "",
  org: "",
  website: "",
  message: "",
  lat: "",
  lng: "",
  placeName: "",
};

export const DEFAULT_SETTINGS = {
  size: 300,
  margin: 4, // quiet zone, measured in modules (one module = one QR square)
  level: "M",
  dotType: "rounded",
  cornerSquareType: "extra-rounded",
  cornerDotType: "dot",
  fgColor: "#111827",
  useGradient: false,
  gradientColor: "#1a73e8",
  gradientType: "linear",
  gradientRotation: 45,
  bgColor: "#ffffff",
  logo: null, // small data URL of the uploaded logo
  logoSize: 0.3, // share of the code's width the logo may cover
};

export const DOT_TYPES = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Rounded" },
  { id: "extra-rounded", label: "Soft" },
  { id: "dots", label: "Dots" },
  { id: "classy", label: "Classy" },
  { id: "classy-rounded", label: "Classy round" },
];

export const CORNER_SQUARE_TYPES = [
  { id: "square", label: "Square" },
  { id: "extra-rounded", label: "Rounded" },
  { id: "dot", label: "Circle" },
];

export const CORNER_DOT_TYPES = [
  { id: "square", label: "Square" },
  { id: "dot", label: "Circle" },
];

// A preset only changes the look, never the content.
export const PRESETS = [
  {
    name: "Classic",
    settings: { dotType: "square", cornerSquareType: "square", cornerDotType: "square", fgColor: "#000000", useGradient: false, bgColor: "#ffffff", level: "M", margin: 4 },
  },
  {
    name: "Google",
    settings: { dotType: "rounded", cornerSquareType: "extra-rounded", cornerDotType: "dot", fgColor: "#1a73e8", useGradient: true, gradientColor: "#188038", gradientType: "linear", gradientRotation: 45, bgColor: "#ffffff", level: "Q", margin: 4 },
  },
  {
    name: "Midnight",
    settings: { dotType: "dots", cornerSquareType: "dot", cornerDotType: "dot", fgColor: "#1e1b4b", useGradient: true, gradientColor: "#6d28d9", gradientType: "radial", gradientRotation: 0, bgColor: "#f5f3ff", level: "Q", margin: 4 },
  },
  {
    name: "Sunset",
    settings: { dotType: "classy-rounded", cornerSquareType: "extra-rounded", cornerDotType: "dot", fgColor: "#c2410c", useGradient: true, gradientColor: "#9d174d", gradientType: "linear", gradientRotation: 90, bgColor: "#fff7ed", level: "Q", margin: 4 },
  },
  {
    name: "Forest",
    settings: { dotType: "extra-rounded", cornerSquareType: "extra-rounded", cornerDotType: "square", fgColor: "#14532d", useGradient: false, bgColor: "#f0fdf4", level: "Q", margin: 4 },
  },
  {
    name: "Print",
    settings: { dotType: "square", cornerSquareType: "square", cornerDotType: "square", fgColor: "#000000", useGradient: false, bgColor: "#ffffff", level: "H", margin: 6 },
  },
];

export const STORAGE_KEYS = {
  recent: "qr-recent",
  theme: "qr-theme",
};

export const MAX_RECENT = 8;

// Limits for the bulk generator, so the browser doesn't freeze.
export const BULK_LIMIT = 200;
