import jwt from 'jsonwebtoken';

// Fail fast rather than silently signing tokens with a guessable fallback.
// A weak secret means anyone can forge an `owner` token and bypass every
// permission check in the system.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres).'
  );
}

const SECRET: string = process.env.JWT_SECRET;

export interface TokenPayload {
  userId: string;
  role: 'owner' | 'supervisor' | 'billing';
  name: string;
  email: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
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
