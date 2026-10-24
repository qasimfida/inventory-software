/** Desktop-only adapter; load only after detecting the Tauri host. */
export const loadDesktopLinks = () => import('@tauri-apps/plugin-deep-link');
