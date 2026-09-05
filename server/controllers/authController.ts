import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { hashPassword, verifyPassword } from '../auth/passwordUtils';
import { generateToken } from '../auth/jwtUtils';
import { AuthenticatedRequest } from '../auth/authMiddleware';

export async function register(req: Request, res: Response) {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Please provide email, name, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(userId, email.toLowerCase().trim(), name.trim(), passwordHash);

    const token = generateToken({ userId, email: email.toLowerCase().trim(), name: name.trim() });

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        name: name.trim(),
      },
    });
  } catch (error: any) {
    console.error('[Auth] Register error:', error);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken({ userId: user.id, email: user.email, name: user.name });

    return res.json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

export function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const user: any = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user });
  } catch (error: any) {
    console.error('[Auth] GetMe error:', error);
    return res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
}
