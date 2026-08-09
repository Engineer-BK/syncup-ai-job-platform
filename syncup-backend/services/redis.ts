import { Redis } from "@upstash/redis";

/**
 * UPSTASH REDIS CLIENT
 * 
 * WHAT IS REDIS?
 * Redis is an in-memory key-value data store that works at lightning speeds (sub-millisecond latency).
 * We use Upstash Redis to cache frequently accessed data (like Job Listings) so our database 
 * doesn't get overloaded when thousands of users visit the home page.
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
