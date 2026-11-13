import { json, type Ctx } from '../../shared/server';

/** Public (non-secret) payment settings the browser needs. */
export const onRequestGet = async ({ env }: Ctx) =>
  json({
    stripePublishableKey: env.STRIPE_PUBLISHABLE_KEY && env.STRIPE_SECRET_KEY ? env.STRIPE_PUBLISHABLE_KEY : null,
    square:
      env.SQUARE_ACCESS_TOKEN && env.SQUARE_APPLICATION_ID && env.SQUARE_LOCATION_ID
        ? {
            applicationId: env.SQUARE_APPLICATION_ID,
            locationId: env.SQUARE_LOCATION_ID,
            environment: env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
          }
        : null,
  });
