// Expo's web build uses HttpOnly cookies, never native storage or browser token persistence.
export function createCredentialStore() {
  return null;
}
