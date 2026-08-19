import "server-only";
import { cjRequest, isCjConfigured, verifyCjConnection } from "./client";
import type {
  CjCreateOrderInput,
  CjInventoryLevel,
  CjOrderResult,
  CjProductSummary,
  CjTrackingInfo,
  CjVariant,
} from "./types";

export { isCjConfigured, verifyCjConnection } from "./client";
export type * from "./types";

/**
 * Product list / search — official: GET/POST product list & query endpoints.
 * Uses product/query when a keyword is provided; otherwise product/list.
 * Exact query params beyond page may vary; we pass only documented-style fields.
 */
export async function searchProducts(
  query: string,
  opts?: { page?: number; pageSize?: number }
): Promise<CjProductSummary[]> {
  const page = opts?.page ?? 1;
  const pageSize = Math.min(opts?.pageSize ?? 20, 50);

  // Official list: /product/list — query: /product/query
  if (query.trim()) {
    const data = await cjRequest<unknown>("/product/query", {
      method: "POST",
      body: {
        keyWord: query.trim(),
        pageNum: page,
        pageSize,
      },
    });
    return normalizeProductList(data);
  }

  const data = await cjRequest<unknown>("/product/list", {
    method: "POST",
    body: { pageNum: page, pageSize },
  });
  return normalizeProductList(data);
}

export async function getProduct(pid: string): Promise<CjProductSummary> {
  const data = await cjRequest<unknown>("/product/query", {
    method: "POST",
    body: { pid },
  });
  const list = normalizeProductList(data);
  const found = list.find((p) => p.pid === pid) ?? list[0];
  if (!found) throw new Error("CJ product not found");
  return found;
}

export async function getVariants(pid: string): Promise<CjVariant[]> {
  const data = await cjRequest<unknown>("/product/variant/query", {
    method: "POST",
    body: { pid },
  });
  return normalizeVariantList(data);
}

export async function getVariantsByVid(vid: string): Promise<CjVariant[]> {
  const data = await cjRequest<unknown>("/product/variant/queryByVid", {
    method: "POST",
    body: { vid },
  });
  return normalizeVariantList(data);
}

export async function getInventory(vid: string): Promise<CjInventoryLevel> {
  const data = await cjRequest<unknown>("/product/stock/queryByVid", {
    method: "POST",
    body: { vid },
  });
  if (Array.isArray(data)) {
    return (data[0] as CjInventoryLevel) ?? { vid, quantity: 0 };
  }
  if (data && typeof data === "object") {
    return data as CjInventoryLevel;
  }
  return { vid, quantity: 0 };
}

/**
 * Create order via official Create Order V3.
 * Must only be called after LÉVANCE payment is confirmed.
 * orderNumber should be the LÉVANCE order_number for correlation/idempotency.
 */
export async function createOrder(
  input: CjCreateOrderInput
): Promise<CjOrderResult> {
  const body = {
    orderNumber: input.orderNumber,
    shippingZip: input.shippingZip,
    shippingCountry: input.shippingCountry,
    shippingCountryCode: input.shippingCountryCode,
    shippingProvince: input.shippingProvince,
    shippingCity: input.shippingCity,
    shippingCounty: input.shippingCounty,
    shippingPhone: input.shippingPhone,
    shippingCustomerName: input.shippingCustomerName,
    shippingAddress: input.shippingAddress,
    shippingAddress2: input.shippingAddress2,
    products: input.products,
    orderFlow: input.orderFlow ?? 1,
    isSandbox: input.isSandbox ?? (process.env.CJ_SANDBOX === "1" ? 1 : 0),
    logisticName: input.logisticName,
    remark: input.remark,
  };

  const data = await cjRequest<CjOrderResult>("/shopping/order/createOrderV3", {
    method: "POST",
    body,
  });
  return data ?? {};
}

export async function getOrder(orderIdOrNumber: string): Promise<CjOrderResult> {
  // Official getOrderDetail — parameter name may be orderId or orderNumber
  const data = await cjRequest<CjOrderResult>("/shopping/order/getOrderDetail", {
    method: "GET",
    searchParams: { orderId: orderIdOrNumber },
  }).catch(async () =>
    cjRequest<CjOrderResult>("/shopping/order/getOrderDetail", {
      method: "GET",
      searchParams: { orderNumber: orderIdOrNumber },
    })
  );
  return data ?? {};
}

/**
 * Tracking — official current endpoint: /logistic/trackInfo
 * (getTrackInfo is deprecated per API list)
 */
export async function getTracking(
  orderIdOrTrack: string
): Promise<CjTrackingInfo> {
  const data = await cjRequest<unknown>("/logistic/trackInfo", {
    method: "GET",
    searchParams: { orderId: orderIdOrTrack },
  }).catch(async () =>
    cjRequest<unknown>("/logistic/trackInfo", {
      method: "GET",
      searchParams: { trackingNumber: orderIdOrTrack },
    })
  );

  if (Array.isArray(data)) return (data[0] as CjTrackingInfo) ?? {};
  return (data as CjTrackingInfo) ?? {};
}

function normalizeProductList(data: unknown): CjProductSummary[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as CjProductSummary[];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.list)) return obj.list as CjProductSummary[];
  if (Array.isArray(obj.content)) return obj.content as CjProductSummary[];
  if (Array.isArray(obj.records)) return obj.records as CjProductSummary[];
  if (obj.pid) return [obj as CjProductSummary];
  return [];
}

function normalizeVariantList(data: unknown): CjVariant[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as CjVariant[];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.list)) return obj.list as CjVariant[];
  if (Array.isArray(obj.variants)) return obj.variants as CjVariant[];
  if (obj.vid) return [obj as CjVariant];
  return [];
}
