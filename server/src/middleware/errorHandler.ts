import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): Response => {
  // Always log full error server-side for diagnostics
  console.error('🔥 Server Unhandled Error:', err.name, err.message, err.stack);

  // Filter out internal Prisma/Database/SQL messages or file paths from client responses
  const isInternalDatabaseError =
    err.name?.includes('Prisma') ||
    err.message?.includes('prisma') ||
    err.message?.includes('SELECT') ||
    err.message?.includes('INSERT') ||
    err.message?.includes('UPDATE') ||
    err.message?.includes('DELETE') ||
    err.message?.includes('table');

  const safeMessage = isInternalDatabaseError
    ? 'An unexpected database error occurred.'
    : err.message && !err.message.includes('/') && !err.message.includes('\\')
    ? err.message
    : 'Internal server error';

  return sendError(
    res,
    safeMessage,
    500,
    'INTERNAL_SERVER_ERROR'
  );
};
