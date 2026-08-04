/** Configuración central del motor de IA usado para detectar marcas. */
export const AI_MODEL_ID = "google/gemini-3.6-flash";
export const AI_MODEL_LABEL = "Gemini 3.6 Flash (visión)";
export const AI_ENGINE_LABEL = "Lovable AI Gateway · Gemini 3.6 Flash";
export const AI_ENGINE_VERSION = "v2 · logo + contexto de descripción + caché";

/** Marcas canónicas conocidas en catálogos de tecnología / electrodomésticos. */
export const KNOWN_BRANDS = [
  "APPLE", "SAMSUNG", "HP", "DELL", "LENOVO", "LG", "SONY", "XIAOMI", "HUAWEI",
  "ACER", "ASUS", "MSI", "MOTOROLA", "OPPO", "VIVO", "NOKIA", "PANASONIC",
  "PHILIPS", "EPSON", "CANON", "BROTHER", "LOGITECH", "MICROSOFT", "GOOGLE",
  "TCL", "HISENSE", "MIRAY", "ONEPLUS", "REDMI", "HONOR", "REALME", "JBL",
  "BOSE", "AMAZON", "INTEL", "AMD", "NVIDIA", "KINGSTON", "SANDISK", "SEAGATE",
  "WESTERN DIGITAL", "CORSAIR", "RAZER", "HYPERX", "STEELSERIES", "TP-LINK",
  "D-LINK", "MIKROTIK", "UBIQUITI", "CISCO", "ANKER", "BELKIN", "XEROX",
  "LEXMARK", "OSTER", "IMACO", "ELECTROLUX", "MABE", "INDURAMA", "BOSCH",
  "WHIRLPOOL", "GENERAL ELECTRIC", "NINTENDO", "PLAYSTATION", "XBOX", "GOPRO",
  "DJI", "GARMIN", "FITBIT", "HIKVISION", "DAHUA", "ACTECK", "GENIUS",
  "MICRONICS", "ANTRYX", "TEROS", "HALION", "ADVANCE", "KLIPXTREME",
] as const;

/** Alias frecuentes → marca canónica. */
export const BRAND_ALIASES: Record<string, string> = {
  "HEWLETT PACKARD": "HP",
  "HEWLETT-PACKARD": "HP",
  "HP INC": "HP",
  "HP INC.": "HP",
  "WD": "WESTERN DIGITAL",
  "GE": "GENERAL ELECTRIC",
  "MAC": "APPLE",
  "MACBOOK": "APPLE",
  "IPHONE": "APPLE",
  "IPAD": "APPLE",
  "GALAXY": "SAMSUNG",
  "THINKPAD": "LENOVO",
  "IDEAPAD": "LENOVO",
  "LEGION": "LENOVO",
  "VICTUS": "HP",
  "PAVILION": "HP",
  "OMEN": "HP",
  "INSPIRON": "DELL",
  "LATITUDE": "DELL",
  "ALIENWARE": "DELL",
  "VOSTRO": "DELL",
  "PREDATOR": "ACER",
  "NITRO": "ACER",
  "ASPIRE": "ACER",
  "ROG": "ASUS",
  "TUF": "ASUS",
  "ZENBOOK": "ASUS",
  "VIVOBOOK": "ASUS",
  "POCO": "XIAOMI",
  "MI": "XIAOMI",
  "PS5": "PLAYSTATION",
  "PS4": "PLAYSTATION",
  "SONY PLAYSTATION": "PLAYSTATION",
  "TP LINK": "TP-LINK",
  "TPLINK": "TP-LINK",
  "KLIP XTREME": "KLIPXTREME",
};

/** Normaliza cualquier texto de marca a su forma canónica ("" si no se reconoce). */
export function canonicalBrand(raw: string): string {
  const u = raw
    .toUpperCase()
    .replace(/[^A-Z0-9 .-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!u || u === "N/A" || u === "NA" || u === "DESCONOCIDO" || u === "UNKNOWN") return "";
  if (BRAND_ALIASES[u]) return BRAND_ALIASES[u];
  const exact = KNOWN_BRANDS.find((b) => b === u);
  if (exact) return exact;
  // coincidencia por token dentro del texto
  for (const b of KNOWN_BRANDS) {
    const re = new RegExp(`(^|[^A-Z])${b.replace(/[-.]/g, "\\$&")}([^A-Z]|$)`);
    if (re.test(u)) return b;
  }
  for (const [alias, canon] of Object.entries(BRAND_ALIASES)) {
    const re = new RegExp(`(^|[^A-Z])${alias.replace(/[-.]/g, "\\$&")}([^A-Z]|$)`);
    if (re.test(u)) return canon;
  }
  // Marca desconocida pero plausible (1-2 palabras, sin dígitos sueltos)
  if (/^[A-Z][A-Z0-9 .-]{1,24}$/.test(u) && u.split(" ").length <= 2) return u;
  return "";
}

/** Deduce la marca desde la descripción del producto. */
export function guessBrandFromText(text: string): string {
  return canonicalBrand(text);
}
