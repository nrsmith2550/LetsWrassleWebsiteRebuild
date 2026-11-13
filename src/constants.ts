export const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'READY_FOR_PICKUP', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export const FULFILLMENT_METHODS = ['SHIPPING', 'LOCAL_PICKUP'] as const;
export const GATEWAYS = ['STRIPE', 'SQUARE'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Gateway = (typeof GATEWAYS)[number];
export type Fulfillment = (typeof FULFILLMENT_METHODS)[number];
