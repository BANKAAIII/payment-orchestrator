import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { connectRabbitMQ } from './config/rabbitmq.js'
import { connectRedis } from './config/redis.js'
import { setupTopology } from './loaders/setup-topology.js'
import { verifyUpiIdWorker } from './workers/initiated/verify-upi-id.js'
import { Connection } from 'amqplib'
import amqp from 'amqplib';
import transactionRoutes from './routes/brokertestPayment.js'
import "./routes/testTillProcessing.js"
import { startOutboxPoller } from './services/outboxPoller.js'
import { dbRoutes } from './routes/dbRoutes/index.js'


type RabbitConnection = amqp.Connection & {
    createChannel: () => Promise<amqp.Channel>;
};



const app = new Hono()
const PORT = 3002
async function startServer() {

 
app.get('/', (c) => {
  return c.text('orchestratorService(server) is active and running!');
})

    serve({
      fetch: app.fetch,
      port: PORT,
      hostname:'0.0.0.0'
    }, (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    });

 
}

app.route('/api/test',transactionRoutes);
app.route('api/test',dbRoutes);

async function main() {
  // 1. Connect to Infrastructure
  const rabbitConnection = await connectRabbitMQ();
  await connectRedis();

  // Cast it to your custom type so TypeScript knows createChannel returns a Promise
  const typedConnection = rabbitConnection as RabbitConnection;

  // 2. Setup Exchanges & Queues
  const setupChannel = await typedConnection.createChannel();
  await setupTopology(setupChannel);
  await setupChannel.close();

  startOutboxPoller();
  // 3. Start Workers
  await verifyUpiIdWorker(typedConnection);
  // await startFraudWorker(typedConnection);
  // await startExtraWorker(typedConnection);

  console.log('[*] Orchestrator Service is fully running.');
}


await startServer();

main().catch(console.error);






