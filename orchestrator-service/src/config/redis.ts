// src/config/redis.ts
import { createClient, RedisClientType } from 'redis';

// src/config/redis.ts
const REDIS_URL = process.env.REDIS_URL || 'redis://redis-service:6379'; // Replace 'redis-service' with your actual Redis container/service name in docker-compose.yml

export const redisClient: RedisClientType = createClient({
  url: REDIS_URL,
});

redisClient.on('error', (err) => console.error('[Redis] Client Error:', err));

export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('[Redis] Connected successfully.');
  }
}