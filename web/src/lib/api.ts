const BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: any; form?: FormData } = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method: opts.method || (opts.body || opts.form ? 'POST' : 'GET'),
    credentials: 'include',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  return data as T;
}

/** Resolve uploaded-image URLs (relative /uploads/... when API is on another origin). */
export const assetUrl = (u: string) => (u?.startsWith('/') ? `${BASE}${u}` : u);

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export interface Variant {
  id: number;
  sku: string;
  size: string;
  color: string;
  priceCents: number;
  priceOverrideCents: number | null;
  stockQuantity: number;
}
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  basePriceCents: number;
  minPriceCents: number;
  categoryId: number;
  category?: { id: number; name: string; slug: string };
  images: string[];
  isFeatured: boolean;
  isActive: boolean;
  totalStock: number;
  createdAt: string;
  defaultWeightOz: number;
  defaultLengthIn: number;
  defaultWidthIn: number;
  defaultHeightIn: number;
  variants: Variant[];
}
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
}
export interface Video {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  featuredName: string;
  isPublished: boolean;
  sortOrder: number;
}
export interface OrderItem {
  id?: number;
  productName: string;
  variantSummary: string;
  quantity: number;
  unitPriceCents: number;
}
export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentMethod: 'SHIPPING' | 'LOCAL_PICKUP';
  shippingAddress: null | { line1: string; line2?: string; city: string; state: string; postalCode: string; country?: string };
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  paymentProvider: 'STRIPE' | 'SQUARE';
  paymentTransactionId: string | null;
  paymentStatus: string;
  orderStatus: string;
  shippingCarrier: string | null;
  shippingService: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippingLabelPdfUrl: string | null;
  createdAt: string;
  items: OrderItem[];
}
export interface AppConfig {
  gateways: ('STRIPE' | 'SQUARE')[];
  primaryGateway: 'STRIPE' | 'SQUARE' | null;
  stripePublishableKey: string | null;
  square: { applicationId: string; locationId: string; environment: 'sandbox' | 'production' } | null;
  store: { shippingFlatCents: number; freeShippingOverCents: number; taxRate: number };
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  READY_FOR_PICKUP: 'Ready for pickup',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};
export const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-200 text-gray-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  READY_FOR_PICKUP: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-orange/20 text-orange-dark',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};
