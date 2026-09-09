import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me';
const JWT_TTL = '30d';

if (!process.env.JWT_SECRET) {
  console.warn('[Auth] JWT_SECRET is not set -- using an insecure development default. Set JWT_SECRET in .env before deploying.');
}

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_TTL });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (!decoded.userId || !decoded.email || !decoded.name) return null;
    return { userId: decoded.userId, email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}
