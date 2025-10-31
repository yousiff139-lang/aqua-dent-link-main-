export const ADMIN_EMAILS: string[] = [
  // Add more admin emails here as needed
  "karrarmayaly@gmail.com",
  "bingo@gmail.com",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some(admin => admin.toLowerCase() === email.toLowerCase());
}


