import type { User } from '../types';

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User, token: string) {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', token);
}

export function clearAuth() {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}
