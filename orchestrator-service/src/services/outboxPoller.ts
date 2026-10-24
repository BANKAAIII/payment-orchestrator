import { pool } from "../config/db.js";
import { getRabbitMQChannel } from "../config/rabbitmq.js";
import { generateNewTxnDetails } from "../middlewares/txnInitiation/middleware2.js";

export type outboxStatus =['PENDING' , 'PROCESSING' , 'SENT' , 'FAILED'];

const batchSize = 50;
const interval = 1000;

export async function startOutboxPoller (){
    console.log("---- Entering the outbox poller -----");
    setInterval(async()=>{
        try{
            // processOutboxBatch.
           await processOutboxBatch()
        }catch(err){
            console.error({
                msg:"error encountered in outboxPoller",
                error:err
            },500)
        }
    },interval);
}

async function processOutboxBatch(){
    const channel = await getRabbitMQChannel();
    const client = await pool.connect();
    let pendingTxnReqs : any = []
    try{
        await client.query('BEGIN');

        // check for pending transaction requests.
        const pendingTxns = await client.query(`
            SELECT id ,payload , status
            FROM outbox_events
            WHERE status = 'PENDING'
            ORDER BY created_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED;
            `,[batchSize]);

        if(pendingTxns.rowCount === 0){
            console.log("no pending txns in outbox to send to Rabbitmq.");
            await client.query('COMMIT');
            return;
        }

        pendingTxnReqs = pendingTxns.rows;
        const ids = pendingTxnReqs.map((txn:any)=> txn.id);

        await client.query(`
            UPDATE outbox_events
            SET status = 'PROCESSING' 
            WHERE id = ANY($1) 
            `,[ids])
            await client.query('COMMIT');

            
    }catch(err){
        await client.query('ROLLBACK');
        console.error("[Outbox Poller] Transaction error during lock:", err);
        return;
    }finally{
        client.release();
    }

    for(const event of pendingTxnReqs){
        try{
            const payload :generateNewTxnDetails = JSON.parse(event.payload);
        
        // routing_key ,  status , priority , 
        const routing_key = payload.current_routing_key
        const priority = payload.priority
        const payloadBuffer = Buffer.from(JSON.stringify(payload))
        const published = await channel.publish(
            'transaction',
            routing_key,
            payloadBuffer,
            {
                persistent :true,
                priority : Number(payload.priority) || 1
            }
        )

        if(!published){
            throw new Error("RabbitMQ channel write buffer full");
        }

        // once sent to rabbitmq set the outboxTxn statuses
        await pool.query(`
                UPDATE outbox_events 
                SET outbox_status = 'SENT'
                WHERE id = $1
            `, [event.id]);
        }catch(err){
            console.error(`[Outbox Poller] Failed to dispatch event ${event.id}:`, err);

            // Revert back to PENDING so it can be retried on the next tick
            await pool.query(`
                UPDATE outbox_events 
                SET outbox_status = 'PENDING' 
                WHERE id = $1
            `, [event.id]);
        }
        
    }
}