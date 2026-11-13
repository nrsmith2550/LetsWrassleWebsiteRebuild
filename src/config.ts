import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const env = process.env;
const num = (v: string | undefined, d: number) => (v !== undefined && v !== '' && !isNaN(Number(v)) ? Number(v) : d);
const bool = (v: string | undefined, d = false) => (v === undefined || v === '' ? d : v === 'true' || v === '1');

const isProd = env.NODE_ENV === 'production';

if (isProd && (!env.JWT_SECRET || env.JWT_SECRET.startsWith('change-me'))) {
  console.error('FATAL: set a strong JWT_SECRET in production.');
  process.exit(1);
}

export const config = {
  isProd,
  port: num(env.PORT, 4000),
  siteUrl: (env.SITE_URL || 'http://localhost:5173').replace(/\/$/, ''),
  clientUrls: (env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean),
  jwtSecret: env.JWT_SECRET || 'dev-only-secret',
  cookieSecure: bool(env.COOKIE_SECURE, false),
  cookieSameSite: (env.COOKIE_SAMESITE || 'lax') as 'lax' | 'none' | 'strict',

  publicDir: path.resolve(__dirname, '../public'),

  storage: {
    driver: (env.STORAGE_DRIVER || 'local') as 'local' | 's3',
    uploadDir: path.resolve(env.UPLOAD_DIR || './uploads'),
    s3: {
      bucket: env.S3_BUCKET || '',
      region: env.S3_REGION || 'auto',
      endpoint: env.S3_ENDPOINT || undefined,
      accessKeyId: env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY || '',
      publicUrl: (env.S3_PUBLIC_URL || '').replace(/\/$/, ''),
    },
  },

  store: {
    shippingFlatCents: num(env.SHIPPING_FLAT_CENTS, 599),
    freeShippingOverCents: num(env.FREE_SHIPPING_OVER_CENTS, 0),
    taxRate: num(env.TAX_RATE, 0.06),
    primaryGateway: (env.PRIMARY_GATEWAY || 'SQUARE').toUpperCase() as 'STRIPE' | 'SQUARE',
  },

  stripe: {
    secretKey: env.STRIPE_SECRET_KEY || '',
    publishableKey: env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
  },
  square: {
    accessToken: env.SQUARE_ACCESS_TOKEN || '',
    applicationId: env.SQUARE_APPLICATION_ID || '',
    locationId: env.SQUARE_LOCATION_ID || '',
    environment: (env.SQUARE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
  },

  shippo: {
    apiKey: env.SHIPPO_API_KEY || '',
    from: {
      name: env.SHIP_FROM_NAME || "Let's Wrassle Apparel",
      street1: env.SHIP_FROM_STREET1 || '',
      city: env.SHIP_FROM_CITY || '',
      state: env.SHIP_FROM_STATE || 'PA',
      zip: env.SHIP_FROM_ZIP || '',
      country: env.SHIP_FROM_COUNTRY || 'US',
      phone: env.SHIP_FROM_PHONE || '',
      email: env.SHIP_FROM_EMAIL || '',
    },
  },

  email: {
    host: env.SMTP_HOST || '',
    port: num(env.SMTP_PORT, 587),
    secure: bool(env.SMTP_SECURE, false),
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.EMAIL_FROM || "Let's Wrassle Apparel <support@letswrassleapparel.com>",
    ownerEmail: env.OWNER_EMAIL || '',
  },
};

export const gatewaysEnabled = {
  STRIPE: !!(config.stripe.secretKey && config.stripe.publishableKey),
  SQUARE: !!(config.square.accessToken && config.square.applicationId && config.square.locationId),
};
