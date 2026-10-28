import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import healthRoutes from './routes/healthRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // 1. Security Headers (configured to allow React Vite assets)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS allowlist (supports localhost, deployed previews, and server-to-server webhooks)
  const configuredOrigins = config.CORS_ORIGIN.split(',').map((s) => s.trim());
  const allowedOrigins = new Set([
    ...configuredOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, server-to-server webhooks)
        if (!origin) return callback(null, true);
        // Allow wildcards or exact match
        if (config.CORS_ORIGIN === '*' || allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        // Allow common deployment preview domains (Vercel, Render, Netlify)
        if (
          origin.endsWith('.vercel.app') ||
          origin.endsWith('.onrender.com') ||
          origin.endsWith('.netlify.app')
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS origin ${origin} not permitted`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Zendesk-Webhook-Signature',
        'X-Zendesk-Webhook-Signature-Timestamp',
      ],
    })
  );

  // 3. Body Parser with raw body preservation for HMAC signature verification
  app.use(
    express.json({
      limit: '2mb',
      verify: (req: any, _res: any, buf: Buffer) => {
        // Preserve raw buffer for webhook signature validation
        req.rawBody = buf;
      },
    })
  );

  app.use(express.urlencoded({ extended: true }));

  // 4. Request Logging (disable in test environment for clean test output)
  if (config.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // 5. Mount API Routes
  app.use(`${config.API_PREFIX}`, healthRoutes);
  app.use(`${config.API_PREFIX}/webhooks`, webhookRoutes);
  app.use('/api/webhooks', webhookRoutes); // Alias per requirement (/api/webhooks/zendesk)
  app.use(`${config.API_PREFIX}/workflows`, workflowRoutes);

  // 6. Serve Unified React Dashboard & Landing Page
  const candidatePaths = [
    path.resolve(process.cwd(), 'public'),
    path.resolve(__dirname, '../public'),
    path.resolve(__dirname, '../../public'),
    path.resolve(__dirname, '../../frontend/dist'),
  ];
  const staticDir = candidatePaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

  if (staticDir) {
    app.use(express.static(staticDir));
    app.get('*', (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  } else {
    // API Root fallback when frontend build is not packaged
    app.get('/', (_req: express.Request, res: express.Response) => {
      res.json({
        message: 'Zendesk–Darwinbox–Box Automation API',
        documentation: `${config.API_PREFIX}/health`,
      });
    });
  }

  // 6. Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export const app = createApp();

