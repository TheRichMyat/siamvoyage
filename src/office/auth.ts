export const OFFICE_AUTH_KEY = 'siamvoyage_office_auth';

export const OFFICE_CREDENTIALS = {
  username: 'admin',
  password: 'siamvoyage2026'
} as const;

export function isOfficeAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(OFFICE_AUTH_KEY) === '1';
  } catch {
    return false;
  }
}

export function setOfficeAuthenticated(): void {
  sessionStorage.setItem(OFFICE_AUTH_KEY, '1');
}

export function clearOfficeAuth(): void {
  sessionStorage.removeItem(OFFICE_AUTH_KEY);
}

export function validateOfficeLogin(username: string, password: string): boolean {
  return (
    username === OFFICE_CREDENTIALS.username &&
    password === OFFICE_CREDENTIALS.password
  );
}
