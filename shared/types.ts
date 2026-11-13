export interface CatVariant {
  id: string;
  size: string;
  color: string;
  priceCents: number;
  inStock: boolean;
}

export interface CatProduct {
  slug: string;
  name: string;
  category: string;
  description: string;
  images: string[];
  featured: boolean;
  active: boolean;
  isNew: boolean;
  date: string;
  priceCents: number;
  minPriceCents: number;
  variants: CatVariant[];
}

export interface CatCategory {
  name: string;
  slug: string;
  description: string;
}

export interface CatVideo {
  id: number;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  featuredName: string;
  published: boolean;
}

export interface CatSettings {
  announcement: string;
  shippingFlatCents: number;
  freeShippingOverCents: number;
  taxRate: number;
  pickupNotice: string;
}

export interface Catalog {
  settings: CatSettings;
  categories: CatCategory[];
  products: CatProduct[];
  videos: CatVideo[];
}

export type Fulfillment = 'SHIPPING' | 'LOCAL_PICKUP';

export interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CartItem {
  variantId: string;
  quantity: number;
}

export interface CheckoutRequest {
  items: CartItem[];
  customer: { name: string; email: string; phone: string };
  fulfillment: Fulfillment;
  address?: Address;
}

export interface PricedLine {
  variantId: string;
  productName: string;
  variantSummary: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Quote {
  lines: PricedLine[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

/** What gets emailed / shown on the confirmation page. */
export interface OrderSummary extends Quote {
  orderNumber: string;
  provider: 'SQUARE' | 'STRIPE';
  customer: { name: string; email: string; phone: string };
  fulfillment: Fulfillment;
  address?: Address;
}
