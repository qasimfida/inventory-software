// Non-secret installation signal, isolated by API origin. Never an authentication factor.
export async function deviceMarker(): Promise<string | null> {
  try {
    const key = `inventory.device.v1.${import.meta.env.VITE_API_BASE_URL as string}`;
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const marker = crypto.randomUUID();
    localStorage.setItem(key, marker);
    return marker;
  } catch {
    return null;
  }
}
