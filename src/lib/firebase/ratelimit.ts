import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const limits = {
  free: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 d") }),
  starter: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(200, "1 d") }),
  pro: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(2000, "1 d") }),
  agency: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20000, "1 d") }),
};

export async function checkLimit(plan: keyof typeof limits, key: string) {
  return limits[plan].limit(key);
}
