import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../utils/validation.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { config } from '../config/env.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(
        res,
        'Invalid registration data',
        400,
        'VALIDATION_ERROR',
        parseResult.error.issues
      );
      return;
    }

    const user = await AuthService.register(parseResult.data);
    sendSuccess(res, user, 'User registered successfully. Public accounts default to DEVELOPER role.', 201);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'USER_ALREADY_EXISTS') {
      sendError(res, 'User with this email already exists', 409, 'USER_EXISTS');
      return;
    }
    sendError(res, 'Registration failed', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(
        res,
        'Invalid login credentials format',
        400,
        'VALIDATION_ERROR',
        parseResult.error.issues
      );
      return;
    }

    const result = await AuthService.login(parseResult.data);

    // Set refresh token strictly in HttpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

    sendSuccess(
      res,
      {
        accessToken: result.accessToken,
        user: result.user,
      },
      'Authentication successful'
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
      sendError(res, 'Invalid email or password', 401, 'UNAUTHORIZED');
      return;
    }
    sendError(res, 'Login failed', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      sendError(res, 'Refresh token cookie missing', 401, 'UNAUTHORIZED');
      return;
    }

    const result = await AuthService.refresh(refreshToken);

    // Set new rotated refresh token in HttpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, COOKIE_OPTIONS);

    sendSuccess(
      res,
      {
        accessToken: result.accessToken,
        user: result.user,
      },
      'Token refreshed successfully'
    );
  } catch (error: unknown) {
    res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
    sendError(res, 'Invalid, expired, or revoked refresh token', 401, 'UNAUTHORIZED');
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error: unknown) {
    res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
    sendSuccess(res, null, 'Logged out successfully');
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const user = await AuthService.getCurrentUser(req.user.id);
    sendSuccess(res, user, 'Authenticated user profile retrieved');
  } catch (error: unknown) {
    sendError(res, 'Failed to fetch user profile', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const getDevelopers = async (req: Request, res: Response): Promise<void> => {
  try {
    const developers = await AuthService.getDevelopers();
    sendSuccess(res, developers, 'Developer users retrieved');
  } catch (error: unknown) {
    sendError(res, 'Failed to fetch developers', 500, 'INTERNAL_SERVER_ERROR');
  }
};
