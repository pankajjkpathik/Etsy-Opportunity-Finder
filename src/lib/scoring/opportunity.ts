import type { EtsyListing } from "../etsy/types";

export type ScoreBreakdown = {
  competition_inverse: { score: number; max: number; raw: number };
  review_density:       { score: number; max: number; raw: number };
  price_strength:       { score: number; max: number; raw: number };
  new_listing_velocity: { score: number; max: number; raw: number };
  favorite_velocity:    { score: number; max: number; raw: number };
  shop_diversity:       { score: number; max: number; raw: number };
};

export type OpportunityResult = {
  score: number;
  breakdown: ScoreBreakdown;
  confidence: number;
  risk: "Low" | "Medium" | "High";
  recommendation: string;
  data_sources: string[];
};

const W = {
  competition_inverse: 30,
  review_density:      20,
  price_strength:      15,
  new_listing_velocity: 15,
  favorite_velocity:    10,
  shop_diversity:       10,
};

export function computeOpportunity(
  query: string,
  totalCount: number,
  listings: EtsyListing[],
  reviewMedian: number,
  categoryMedianPrice: number
): OpportunityResult {
  const now = Date.now() / 1000;
  const ages = listings.map((l) => (now - l.creation_timestamp) / 86400);

  // 1. Competition inverse — log-scaled vs. baseline of 50k listings
  const compRaw = Math.min(1, Math.log10(Math.max(1, totalCount)) / Math.log10(50000));
  const competition_inverse = (1 - compRaw) * W.competition_inverse;

  // 2. Review density (proxy via num_favorers as Etsy v3 doesn't return reviews on listing search)
  const favMedian = median(listings.map((l) => l.num_favorers));
  const review_density = Math.min(1, Math.log10(1 + favMedian) / 3) * W.review_density;

  // 3. Price strength vs. category median
  const priceMedian = median(listings.map((l) => l.price.amount / l.price.divisor));
  const priceRatio = categoryMedianPrice > 0 ? priceMedian / categoryMedianPrice : 1;
  const price_strength = Math.min(1, priceRatio / 1.5) * W.price_strength;

  // 4. New listing velocity — % of sample created in last 90 days
  const newPct = ages.filter((a) => a <= 90).length / Math.max(1, ages.length);
  const new_listing_velocity = newPct * W.new_listing_velocity;

  // 5. Favorite velocity — favorites per day of listing age
  const velocities = listings.map((l, i) => l.num_favorers / Math.max(1, ages[i]));
  const favVel = median(velocities);
  const favorite_velocity = Math.min(1, favVel / 0.5) * W.favorite_velocity;

  // 6. Shop diversity — 1 - HHI
  const shopCounts: Record<number, number> = {};
  for (const l of listings) shopCounts[l.shop_id] = (shopCounts[l.shop_id] ?? 0) + 1;
  const total = listings.length || 1;
  const hhi = Object.values(shopCounts).reduce((s, c) => s + (c / total) ** 2, 0);
  const shop_diversity = (1 - hhi) * W.shop_diversity;

  const breakdown: ScoreBreakdown = {
    competition_inverse: { score: round(competition_inverse), max: W.competition_inverse, raw: totalCount },
    review_density:      { score: round(review_density),      max: W.review_density,      raw: favMedian },
    price_strength:      { score: round(price_strength),      max: W.price_strength,      raw: priceMedian },
    new_listing_velocity:{ score: round(new_listing_velocity),max: W.new_listing_velocity, raw: newPct },
    favorite_velocity:   { score: round(favorite_velocity),   max: W.favorite_velocity,   raw: favVel },
    shop_diversity:      { score: round(shop_diversity),      max: W.shop_diversity,      raw: 1 - hhi },
  };

  const score = round(
    competition_inverse + review_density + price_strength +
    new_listing_velocity + favorite_velocity + shop_diversity
  );

  const risk: OpportunityResult["risk"] =
    score >= 70 ? "Low" : score >= 50 ? "Medium" : "High";

  const recommendation =
    risk === "Low"
      ? "Strong signal. Test with 3–5 differentiated variants."
      : risk === "Medium"
      ? "Possible — only enter with a clear unique angle (audience, style, or bundle)."
      : "Crowded or weak demand. Pass unless you have a real differentiator.";

  return {
    score,
    breakdown,
    confidence: listings.length >= 50 ? 0.92 : listings.length / 50,
    risk,
    recommendation,
    data_sources: ["etsy_api"],
  };
}

function median(xs: number[]) {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function round(x: number) { return Math.round(x * 100) / 100; }
