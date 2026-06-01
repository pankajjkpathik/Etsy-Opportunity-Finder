const BASE = "[openapi.etsy.com](https://openapi.etsy.com/v3/application)";

type FetchOpts = { revalidate?: number };

async function etsyGet<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-api-key": process.env.ETSY_API_KEY! },
    next: { revalidate: opts.revalidate ?? 21600 }, // 6h cache
  });
  if (!res.ok) throw new Error(`Etsy ${res.status}: ${await res.text()}`);
  return res.json();
}

export type EtsyListing = {
  listing_id: number;
  title: string;
  price: { amount: number; divisor: number; currency_code: string };
  num_favorers: number;
  views?: number;
  creation_timestamp: number;
  shop_id: number;
  tags: string[];
};

export async function searchListings(query: string, limit = 100) {
  return etsyGet<{ count: number; results: EtsyListing[] }>(
    `/listings/active?keywords=${encodeURIComponent(query)}&limit=${limit}&sort_on=score`
  );
}

export async function getShop(shopId: number) {
  return etsyGet<any>(`/shops/${shopId}`);
}
