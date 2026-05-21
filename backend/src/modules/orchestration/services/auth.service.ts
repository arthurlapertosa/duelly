import { randomBytes, randomUUID } from 'node:crypto';
import type { AppConfig } from '../../../config/env.js';
import type { UserAccount } from '../domain.js';
import type { OrchestrationRepository } from '../repository.js';
import { hashPassword, hashToken, normalizeEmail, verifyPassword } from './auth-helpers.js';
import { httpError } from './errors.js';

const SESSION_BYTES = 32;

export interface AuthenticatedUser {
  user: UserAccount;
  token?: string;
}

export class AuthService {
  constructor(private readonly repository: OrchestrationRepository, private readonly config: AppConfig) {}

  async register(email: string, password: string): Promise<AuthenticatedUser> {
    const normalized = normalizeEmail(email);
    if (password.length < 8) throw httpError(400, 'PASSWORD_TOO_SHORT');
    if (await this.repository.findUserByEmail(normalized)) throw httpError(409, 'EMAIL_ALREADY_REGISTERED');
    const now = new Date();
    const user: UserAccount = {
      id: `user-${randomUUID()}`,
      email: normalized,
      displayIdentifier: normalized,
      passwordHash: await hashPassword(password),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveUser(user);
    return await this.createSession(user);
  }

  async login(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.repository.findUserByEmail(normalizeEmail(email));
    if (!user || !(await verifyPassword(password, user.passwordHash))) throw httpError(401, 'INVALID_CREDENTIALS');
    return await this.createSession(user);
  }

  async authenticate(header?: string): Promise<AuthenticatedUser | undefined> {
    if (!header?.startsWith('Bearer ')) return undefined;
    const token = header.slice('Bearer '.length).trim();
    if (this.config.auth.mockAuthEnabled && token.startsWith('mock:')) {
      const email = normalizeEmail(token.slice('mock:'.length) || 'mock@example.test');
      let user = await this.repository.findUserByEmail(email);
      if (!user) {
        const now = new Date();
        user = {
          id: `user-${hashToken(email).slice(0, 12)}`,
          email,
          displayIdentifier: email,
          passwordHash: 'mock',
          createdAt: now,
          updatedAt: now,
        };
        await this.repository.saveUser(user);
      }
      return { user, token };
    }
    const session = await this.repository.findSessionByTokenHash(hashToken(token));
    if (!session || session.revokedAt || session.expiresAt <= new Date()) return undefined;
    const user = await this.repository.findUserById(session.userId);
    return user ? { user, token } : undefined;
  }

  async logout(token?: string): Promise<void> {
    if (!token) return;
    const session = await this.repository.findSessionByTokenHash(hashToken(token));
    if (session) await this.repository.revokeSession(session);
  }

  private async createSession(user: UserAccount): Promise<AuthenticatedUser> {
    const token = randomBytes(SESSION_BYTES).toString('base64url');
    const now = new Date();
    await this.repository.saveSession({
      id: `session-${randomUUID()}`,
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + this.config.auth.sessionTtlSeconds * 1000),
      createdAt: now,
      revokedAt: null,
    });
    return { user, token };
  }
}
