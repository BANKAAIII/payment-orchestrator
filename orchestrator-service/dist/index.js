import { serve } from '@hono/node-server';
import { Hono } from 'hono';
// @ts-ignore
import { createMessageBus, setupGracefulShutdown, workersInitiation, registry } from 'shared-core';
const app = new Hono();
const PORT = 3002;
async function startServer() {
    try {
        // 1. Initialize Infrastructure FIRSTcl
        const { connection, channel } = await createMessageBus();
        // 2. Setup safety hooks
        await setupGracefulShutdown(connection, channel);
        // 4. Start Server ONLY after bus is ready
        serve({
            fetch: app.fetch,
            port: PORT
        }, (info) => {
            console.log(`Server is running on http://localhost:${info.port}`);
        });
    }
    catch (err) {
        console.error("Failed to start application:", err);
        process.exit(1); // Crash if infrastructure fails
    }
}
async function initiateWorkers() {
    console.log("entering initiate workers.");
    try {
        console.log("conniecting to rabbit mq");
        const { channel, connection } = await createMessageBus();
        console.log("starting Workers");
        await workersInitiation(channel, connection, registry);
    }
    catch (err) {
        console.log(err);
    }
}
await startServer();
await initiateWorkers();
