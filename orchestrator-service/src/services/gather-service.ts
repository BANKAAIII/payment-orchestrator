// src/services/gather.service.ts
import { createClient } from 'redis';
import amqp from 'amqplib';
import { redisClient } from '../config/redis.js';

export async function handleTaskCompletion(
  transactionId: string, 
  resultKey: string, 
  resultData: any, 
  totalExpectedTasks: number
) {
  // Guard clause to prevent undefined arguments from crashing the Redis RESP encoder
  if (!transactionId || !resultKey || resultData === undefined) {
    console.error("❌ Missing required fields in handleTaskCompletion:", { transactionId, resultKey, resultData });
    return;
  }

  const multi = redisClient.multi();

  // Save specific task result using safe object syntax for hSet
  multi.hSet(`txn:payload:${transactionId}`, {
    [resultKey]: JSON.stringify(resultData)
  });
  
  // Atomically increment counter
  multi.incr(`txn:counter:${transactionId}`);
  
  // Set safety TTL (10 minutes)
  multi.expire(`txn:payload:${transactionId}`, 600);
  multi.expire(`txn:counter:${transactionId}`, 600);

  const replies = await multi.exec();
  
  // Safely check replies array length before accessing index 1
  if (!replies || replies.length < 2) {
    console.error("❌ Invalid multi.exec() replies:", replies);
    return;
  }

  const completedCount = replies[1] as unknown as number;

  // Check Barrier Condition
  if (completedCount === totalExpectedTasks) {
    await triggerNextStep(transactionId);
  }
}

async function triggerNextStep(transactionId: string) {
  const allData = await redisClient.hGetAll(`txn:payload:${transactionId}`);
  console.log(`[🚀 Barrier Reached] All checks complete for ${transactionId}. Data gathered:`, allData);

  // Clean up Redis keys directly
  await redisClient.del(`txn:payload:${transactionId}`);
  await redisClient.del(`txn:counter:${transactionId}`);
}

