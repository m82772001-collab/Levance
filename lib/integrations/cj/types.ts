/**
 * Types aligned with official CJ API 2.0 field definitions where documented.
 * Unknown nested shapes are kept as flexible records — do not invent required fields.
 */

export type CjProductSummary = {
  pid: string;
  productName?: string;
  productNameEn?: string;
  productSku?: string;
  productImage?: string;
  productWeight?: number;
  categoryId?: string;
  categoryName?: string;
  productSellPrice?: number | string;
  [key: string]: unknown;
};

export type CjVariant = {
  vid?: string;
  pid?: string;
  variantSku?: string;
  variantName?: string;
  variantImage?: string;
  variantSellPrice?: number | string;
  variantStandardPrice?: number | string;
  [key: string]: unknown;
};

export type CjInventoryLevel = {
  vid?: string;
  quantity?: number;
  storageId?: string;
  storageName?: string;
  [key: string]: unknown;
};

export type CjCreateOrderProduct = {
  vid?: string;
  sku?: string;
  quantity: number;
  storeProductId?: string;
  storeProductImg?: string;
  storeProductName?: string;
};

export type CjCreateOrderInput = {
  /** LÉVANCE order number — used for idempotency on our side */
  orderNumber: string;
  shippingCountryCode: string;
  shippingCountry: string;
  shippingProvince: string;
  shippingCity: string;
  shippingZip?: string;
  shippingCounty?: string;
  shippingPhone?: string;
  shippingCustomerName?: string;
  shippingAddress?: string;
  shippingAddress2?: string;
  products: CjCreateOrderProduct[];
  /** 1 = CJ product flow (default), 2 = store flow */
  orderFlow?: number;
  /** 0 normal, 1 sandbox (official sandbox flag) */
  isSandbox?: number;
  logisticName?: string;
  remark?: string;
};

export type CjOrderResult = {
  orderId?: string;
  orderNum?: string;
  orderNumber?: string;
  orderStatus?: string;
  [key: string]: unknown;
};

export type CjTrackingInfo = {
  trackingNumber?: string;
  trackingStatus?: string;
  trackingFrom?: string;
  trackingTo?: string;
  deliveryDay?: string;
  deliveryTime?: string;
  logisticName?: string;
  trackingUrl?: string;
  [key: string]: unknown;
};

export type CjOrderStatus =
  | "CREATED"
  | "IN_CART"
  | "UNPAID"
  | "UNSHIPPED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | string;
