import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authLimiter } from './middleware/rateLimiter.js';
import { initSocketServer } from './socket/socket.server.js';

export const app = express();
export const httpServer = createServer(app);

// Express trust proxy configuration for rate-limiting behind reverse proxies
app.set('trust proxy', 1);

// 1. CORS Middleware
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// 2. Cookie Parser
app.use(cookieParser(config.cookieSecret));

// 3. Body Parser
app.use(express.json());

// 4. Helmet Security Headers (Configured to preserve Socket.io & dev environments)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 5. Rate Limiter on sensitive Auth Endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/refresh', authLimiter);
app.use('/api/auth/register', authLimiter);

// 6. API Routes
app.use('/api', routes);

// 7. Centralized Error Handling
app.use(errorHandler);

// Initialize Socket.io server attached to Express HTTP server
export const io = initSocketServer(httpServer);
