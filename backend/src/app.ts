import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env.js';
import healthRoutes from './routes/healthRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // 1. Security Headers
  app.use(helmet());

  // 2. CORS allowlist (supports localhost, 127.0.0.1, and server-to-server webhooks)
  const allowedOrigins = new Set([
    config.CORS_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (curl, server-to-server webhooks)
        if (!origin || allowedOrigins.has(origin)) {
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
      verify: (req: any, _res, buf) => {
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

  // Root fallback
  app.get('/', (_req, res) => {
    res.json({
      message: 'Zendesk–Darwinbox–Box Automation API',
      documentation: `${config.API_PREFIX}/health`,
    });
  });

  // 6. Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export const app = createApp();

