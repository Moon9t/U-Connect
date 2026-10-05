import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';
import { env } from './config/env';
import { createApiRouter } from './routes';
import { sendError } from './utils/response';

export function createApp(db: DatabaseSync): Express {
  const app = express();

  // CORS configuration matching Go backend
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow during development
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      exposedHeaders: ['Content-Length', 'Content-Disposition'],
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint matching Go backend
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'u-connect-backend',
      time: new Date().toISOString(),
    });
  });

  // Mount API router under /api
  app.use('/api', createApiRouter(db));

  // Global 404 handler
  app.use((_req: Request, res: Response) => {
    sendError(res, 'endpoint not found', 404);
  });

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: any) => {
    console.error('Unhandled server error:', err);
    sendError(res, err.message || 'internal server error', 500);
  });

  return app;
}
