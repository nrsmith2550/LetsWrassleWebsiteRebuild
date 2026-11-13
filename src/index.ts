import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { attachUser, requireAdmin } from './middleware/auth';
import adminCatalog from './routes/adminCatalog';
import adminOrders from './routes/adminOrders';
import auth from './routes/auth';
import checkout, { stripeWebhook } from './routes/checkout';
import publicRoutes from './routes/public';
import { errorHandler } from './utils';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Only needed when the frontend is hosted on a different origin than this API.
if (config.clientUrls.length) app.use(cors({ origin: config.clientUrls, credentials: true }));

// Stripe webhook needs the raw body → mount before express.json()
app.post('/api/checkout/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(attachUser);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/checkout', checkout);
app.use('/api/admin/orders', requireAdmin, adminOrders);
app.use('/api/admin', requireAdmin, adminCatalog);
app.use('/api', publicRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Local file storage driver: serve uploaded product images
if (config.storage.driver === 'local') {
  fs.mkdirSync(config.storage.uploadDir, { recursive: true });
  app.use('/uploads', express.static(config.storage.uploadDir, { maxAge: '7d' }));
}

// Production: serve the compiled Vite frontend from this same process
if (fs.existsSync(path.join(config.publicDir, 'index.html'))) {
  app.use(express.static(config.publicDir, { maxAge: '1h', index: false }));
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(config.publicDir, 'index.html')));
}

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Let's Wrassle API listening on http://localhost:${config.port}`);
});
