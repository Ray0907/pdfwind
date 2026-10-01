// Color scheme of the playground chrome: "system" (default) | "light" | "dark". Stored with try/catch (works when storage is blocked).
export const KEY = "pdfwind-chrome-scheme";
export const SCHEMES = ["system", "light", "dark"];
export const readScheme = () => { try { const s = localStorage.getItem(KEY); return SCHEMES.includes(s) ? s : "system"; } catch { return "system"; } };
export const applyScheme = (s) => { if (s === "light" || s === "dark") document.documentElement.dataset.scheme = s; else delete document.documentElement.dataset.scheme; };
export const saveScheme = (s) => { applyScheme(s); try { s === "system" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, s); return true; } catch { return false; } };
