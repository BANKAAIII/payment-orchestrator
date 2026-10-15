// src/config/rabbitmq.ts
import amqp, { Connection ,Channel } from 'amqplib';
import { isNotNull } from 'drizzle-orm';

let connection: any | null = null;
let channel : Channel | null;

export async function connectRabbitMQ(): Promise<any> {
  if (connection) return connection;

  const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://user:password@localhost:5672';
  
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    console.log('[RabbitMQ] Connected successfully.');

    connection.on('close', () => {
      console.error('[RabbitMQ] Connection closed. Reconnecting...');
      connection = null;
      channel = null;
    });

    connection.off('error', (err:any) => {
      console.error('[RabbitMQ] Connection error:', err);
      connection = null;
      channel = null;
    });

    return connection;
  } catch (error) {
    console.error('[RabbitMQ] Connection failed:', error);
    throw error;
  }
}


export async function getRabbitMQChannel(): Promise<Channel> {
  // Return the existing channel if it's open and healthy
  if (channel) return channel;

  // Ensure we have an active connection first
  const conn = await connectRabbitMQ();
  
  if(!conn || typeof conn.createChannel !== 'function'){
    throw new Error("")
  }

  // Create a single shared channel
  channel = await conn.createChannel();

  
  if (channel !== null){
    await channel.assertExchange('payment_exchange', 'topic', { durable: true });
    channel.on('close', () => {
    console.warn('[RabbitMQ] Channel closed. Clearing reference...');
    channel = null;
  });

  return channel;
  }else{
    throw Error("")
  }
  

  
}