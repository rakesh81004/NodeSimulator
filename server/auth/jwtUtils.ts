import crypto from 'crypto';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'dsa-animator-production-secure-key-2025';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export function generateToken(payload: TokenPayload): string {
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Date.now() + TOKEN_TTL_MS,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;

    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof parsed.exp !== 'number' || Date.now() > parsed.exp) {
      return null;
    }

    if (!parsed.userId || !parsed.email || !parsed.name) {
      return null;
    }

    return {
      userId: parsed.userId,
      email: parsed.email,
      name: parsed.name,
    };
  } catch {
    return null;
  }
}
