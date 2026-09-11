import { UserRole } from '@prisma/client';
import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
} from '../utils/token.js';
import { RegisterInput, LoginInput } from '../utils/validation.js';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export class AuthService {
  /**
   * Register a new user.
   * Public registration defaults strictly to UserRole.DEVELOPER.
   */
  public static async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('USER_ALREADY_EXISTS');
    }

    const hashedPassword = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        password: hashedPassword,
        role: UserRole.DEVELOPER, // Enforce DEVELOPER role for public registration
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Authenticate user with email and password.
   * Issues access token and stores hashed refresh token in DB.
   */
  public static async login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await comparePassword(input.password, user.password);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
    });

    // Store SHA-256 hash of refresh token in database
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Rotate refresh token and issue new access token.
   */
  public static async refresh(refreshTokenString: string): Promise<AuthResponse> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenString);
    } catch {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const tokenHash = hashRefreshToken(refreshTokenString);

    // Look up token record in DB
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Token Rotation: Revoke old token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Issue new access and refresh tokens
    const newAccessToken = generateAccessToken({
      userId: tokenRecord.user.id,
      role: tokenRecord.user.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: tokenRecord.user.id,
    });

    const newTokenHash = hashRefreshToken(newRefreshToken);
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: tokenRecord.user.id,
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: tokenRecord.user.id,
        name: tokenRecord.user.name,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
      },
    };
  }

  /**
   * Revoke refresh token and invalidate session.
   */
  public static async logout(refreshTokenString: string): Promise<void> {
    if (!refreshTokenString) return;

    const tokenHash = hashRefreshToken(refreshTokenString);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (tokenRecord && !tokenRecord.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  /**
   * Fetch current authenticated user details.
   */
  public static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return user;
  }

  /**
   * Fetch list of developers for task assignment.
   */
  public static async getDevelopers() {
    return prisma.user.findMany({
      where: { role: UserRole.DEVELOPER },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }
}
