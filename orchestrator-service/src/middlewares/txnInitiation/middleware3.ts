import Redlock from "redlock";
import { getWorkerLogs, pushWorkerLogToRedis, redis, redlock } from "../../loaders/redis.js"
import { Lock } from "redlock";
import { generateNewTxnDetails } from "./middleware2.js";
import { pool } from "../../config/db.js";
import { RouteName, RouteWorkerRecord } from "../../db/schema.js";
// here we acquire the redlock
// insert the newly genereated txn details into the orchestrator-db.


export async function mannualbackoff<T>(
    fn :(parameter:generateNewTxnDetails)=> Promise<T>,
    parameter:generateNewTxnDetails,
    maxRetries : number = 3,
    baseDelay :number = 200
):Promise<T>{
    for( let i=1 ; i <= maxRetries ; i++){

        // try to write database again.
        try{
            // fn : function to make the db call.
            return await fn(parameter);
        }catch(err){
            console.log("error in manual backoff retries",500);
            if( i === maxRetries ){
                throw new Error("mannual retries limit reached ,  caught in try catch block");
            }

            // add the base delay and jitter to prevent thunder herding
            let delay  = baseDelay * Math.pow(2,i-1);

            const jitter = delay * 0.3 * (Math.random() * 2-1);

            delay = Math.floor(delay+jitter);
            console.log(`new delay = delay( ${delay} ) + jitter( ${jitter} ) `);
            console.log("Dealay introduced = ",delay);

            await new Promise( (resolve)=> setTimeout(resolve,delay) );
        }
    }
    throw new Error("max tries reached");
}

export type acquireRedlockResponse = {
    success:boolean,
    getRedlock: Lock 
}
export async function acquireRedlock(transaction_id:string ):Promise<acquireRedlockResponse>{
    
        console.log("Getting redlock inside the acquire Redlock Function");
        const uniqueRedisId = `lock:${transaction_id}`

        let getRedLock;
        try{
        // get redlock for 5 sec
         getRedLock = await redlock.acquire([uniqueRedisId],5000);
        console.log("redlock acquired",getRedLock);
        
        }catch(err:any){
            console.log(err);
            throw new Error(err);
        }

        return {
            success:true,
            getRedlock:getRedLock
    
    }
}

export type dbWriteResType = {
    success: boolean,
    transactionDbWritePayload:any,
    outboxDbWritePayload:any
}
export async function orchestratorDbWrite(payload:any): Promise<dbWriteResType> {
    console.log(".");
    console.log( " DB write function entered " );
    const client = await pool.connect();

    try{
        console.log("entering transaction to make both DB writes");
        await client.query('BEGIN');
        
        const { 
        outbox_status,
        payer_upi_id,
        payee_upi_id,
        amount,
        idempotency_key,
        idempotency_ttl,
        transaction_id,
        gateway_id,
        payer_client_id,
        transaction_status = 'PENDING',
        orchestrator_id,
        priority,
        worker_redis,
        start_timestamp,
        current_routing_key,
        transaction_flag
     } = payload;

    const transactionReqQuery = `
       INSERT INTO  transactions(
        payer_upi_id,
        payee_upi_id,
        amount,
        idempotency_key,
        idempotency_ttl,
        transaction_id,
        gateway_id,
        client_id,
        transaction_status,
        orchestrator_id,
        priority,
        worker_redis,
        start_timestamp,
        current_routing_key,
        transaction_flag
       )

       VALUES( $1 , $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,$14 ,$15)
       RETURNING id, payer_upi_id , transaction_id , transaction_status
    `
    const transactionDbResult = await client.query(transactionReqQuery,[
       payer_upi_id,
       payee_upi_id,
        amount, 
        idempotency_key, 
        idempotency_ttl, 
        transaction_id, 
        gateway_id,
        payer_client_id, 
        transaction_status, 
        orchestrator_id, 
        priority, 
        worker_redis, 
        start_timestamp, 
        current_routing_key,
        transaction_flag
    ]);

    if(transactionDbResult.rowCount === null  || transactionDbResult.rowCount === 0){
        throw new Error("transactions table write failed");
    }
    console.log("transactions table write success",transactionDbResult.rows[0]);
    const outboxQuery =`
        INSERT INTO outbox_events(
            aggregate_id,
            outbox_status,
            payload,
            status,
            created_at,
            routing_key
        )
            VALUES( $1,$2, $3, $4, $5,$6)
            RETURNING id , outbox_status , aggregate_id
    `
    const outboxDbResult = await client.query(outboxQuery, [
    transaction_id,         
    outbox_status,            
    JSON.stringify(payload), 
    'PENDING',              
    start_timestamp,
    current_routing_key           
]);
    if(outboxDbResult.rowCount === null || outboxDbResult.rowCount === 0){
        throw new Error("outbox db write failed");
    }
    console.log("outboxTableWrite successfull",outboxDbResult);
    await client.query('COMMIT');
   return {
    success: true,
    transactionDbWritePayload: transactionDbResult.rows[0],
    outboxDbWritePayload:outboxDbResult.rows[0]

   }
        
    }catch(err:any){
        await client.query('ROLLBACK');
        console.error("--- DB TRANSACTION FAILED ---", err.message || err);
        console.error("Postgres Error Code:", err.code);
        console.error("Detail:", err.detail);
        throw err
    }finally{
        client.release();
    }

    
}




export async function txnInitMiddleware3( c:any , next:any ){
    const startT = performance.now();
    let rlock: acquireRedlockResponse | null = null;

    const txnData = c.get('newTxn');
    console.log("from middleware3 :",txnData);
    const {transaction_id , idempotency_key , worker_redis} = txnData

    try{

       

        if(!transaction_id || !idempotency_key ) {
        throw new Error("inside the middleware 3 we failed to extract the txn_id and idempotency_key form ( c )");
        }


        // try to acquire the redlock.
        rlock = await acquireRedlock(transaction_id);

        // failure cases : max tries ,  max time .

        let dbResult: dbWriteResType | null = null;
        // db write : base try
        try{
            dbResult = await orchestratorDbWrite(txnData);
            console.log(dbResult);
           if(!dbResult.success){
            console.error("db write failed");
            dbResult = await mannualbackoff(orchestratorDbWrite,txnData,3,200);
           }
        }catch(err){
            console.log("error encountered in while initial db write");
            dbResult = await mannualbackoff(orchestratorDbWrite,txnData,3,200);
        }
        
       
        
        // one final check.
        if( !rlock || !dbResult || !dbResult.success){
            throw new Error(" our mannual backoff and redis backoff both failed");
        }

        // get the max worker count
        let maxWCount : RouteName = txnData.maxWorkerCount;

        // create a redis list
        const logInitiation : RouteWorkerRecord ={
            transaction_id: txnData.transaction_id,                 // Not null
            transaction_flag:txnData.transaction_flag,    
            routing_key:txnData.routing_key,                // From routingKeyEnum
            error_message: txnData.error_message,           // Default 'null'
            route_retry: txnData.route_retry,                    // Default '0'
            priority:txnData.priority,              // From transactionPriorityEnum
            workerCount:txnData.worker_count,               // Numeric column maps to string in JS/TS


            maxWorkerCount:maxWCount,         // Numeric column maps to string in JS/TS


            totalWorkerRetries: '0'     ,      // Not null, default '0'
            transaction_status: txnData.transaction_status,     // From txnStatusEnum
            redisLogKey: txnData.worker_redis,            // Optional string
            timeElapsed: null,        // Timestamp with timezone
            created_at: txnData.start_timestamp,             // Default now()
            updated_at: null
        }
        await pushWorkerLogToRedis(worker_redis,logInitiation );
        const redisLog = await getWorkerLogs(worker_redis);
        console.log("redis creation successfull", redisLog);

        // do a automated client retry.

        const endT = performance.now()- startT;
        console.log("time taken to complete middleware 3 :",endT);
        return await next();
    
    
    }catch(err:any){
        if (err.code === '23505') {
            return c.json({ error: "Duplicate transaction already processed" }, 409);
        }
        console.error("error from txnMiddleware3 catch block",err);
        return c.json({ error: "Transaction initialization failed", details: err.message }, 500);
    }finally{
        if (rlock) {
            try {
                console.log("Release start, if no log ahead means release failed");
                // Directly call release() on the Lock instance
                await (rlock.getRedlock as any ).release();
                console.log("Redlock released successfully.");
            } catch (releaseErr) {
                
                console.error("Failed to release redlock:", releaseErr);
            }
        } else {
            console.log("no rlock detected in finally block to release");
        }
    }
    

}