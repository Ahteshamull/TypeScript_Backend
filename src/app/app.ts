import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import os from 'os';
import mongoose from 'mongoose';
import router from './routes';
import globalErrorHandler from '../shared/middlewares/globalErrorHandler';
import { generateDashboardHtml } from '../shared/utils/dashboardTemplate';

const app: Application = express();

// Trust proxy for rate limiting behind reverse proxies (like Vercel, Heroku, etc.)
app.set('trust proxy', 1);

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Response Compression (Gzip/Brotli)
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Live API Hits Counter
let totalApiHits = 0;

// Request counter middleware
app.use((req, res, next) => {
  totalApiHits++;
  next();
});

// Root Endpoint - Live System & Performance Metrics Dashboard
app.get('/', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const totalSystemMem = os.totalmem();
  const freeSystemMem = os.freemem();
  const usedSystemMem = totalSystemMem - freeSystemMem;

  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
  const cpuCores = cpus.length;
  const isDbConnected = mongoose.connection.readyState === 1;

  const html = generateDashboardHtml({
    totalApiHits,
    cpuCores,
    cpuModel,
    arch: os.arch(),
    platform: os.platform(),
    osType: os.type(),
    osRelease: os.release(),
    nodeVersion: process.version,
    processUptime: process.uptime(),
    systemUptime: os.uptime(),
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal,
    rss: memoryUsage.rss,
    external: memoryUsage.external,
    totalSystemMem,
    usedSystemMem,
    freeSystemMem,
    dbStatus: isDbConnected ? 'Connected' : 'Disconnected',
    dbColor: isDbConnected ? '#10b981' : '#ef4444',
  });

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Global Error Handler
app.use(globalErrorHandler);

// Not Found Route
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API Not Found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: 'API Not Found',
      },
    ],
  });
});

export default app;
