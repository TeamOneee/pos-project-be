export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase(); // FR-AUTH-002: unik case-insensitive
}
