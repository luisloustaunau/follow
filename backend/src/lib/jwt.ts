import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export interface TokenPayload {
  userId: string;
  role: 'owner' | 'supervisor' | 'billing';
  name: string;
  email: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}

export function extractToken(authHeader?: string): TokenPayload | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(authHeader.slice(7));
  } catch {
    return null;
  }
}
