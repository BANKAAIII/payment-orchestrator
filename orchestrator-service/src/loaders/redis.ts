import {Redis} from "ioredis";
import Redlock from "redlock";
import { z } from "zod";
import { routeWorkersSchema } from "../db/schema.js";

type RouteWorkerLog = z.output<typeof routeWorkersSchema>;

export const redis = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
});

export const redlock = new Redlock([redis as any], {
    driftFactor: 0.01,
    retryCount: 3, // Handled by your custom backoff loop
    retryDelay: 200,
    retryJitter:50
} as any);



export async function pushWorkerLogToRedis(
    redis_string: string,
    logEntry: RouteWorkerLog
) :Promise<number> {
    const redisConnectionString = redis_string;
    const listLength = await redis.rpush(redisConnectionString,JSON.stringify(logEntry));

    await redis.expire(redisConnectionString,86400);

    return listLength;
}

export async function getWorkerLogs(redisConnectionString:string): Promise<RouteWorkerLog[]> {
        const rawLogs = await redis.lrange(redisConnectionString,0,-1);
        return rawLogs.map((log) => JSON.parse(log));
}

export async function wipeWorkerLogs(redisConnectionString: string): Promise<number> {
    const redisKey = redisConnectionString;
    return await redis.del(redisKey);
}