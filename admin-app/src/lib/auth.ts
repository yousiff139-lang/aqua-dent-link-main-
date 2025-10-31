// Admin emails that can access this portal
export const ADMIN_EMAILS: string[] = [
  "karrarmayaly@gmail.com",
  "bingo@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some(admin => admin.toLowerCase() === email.toLowerCase());
}
