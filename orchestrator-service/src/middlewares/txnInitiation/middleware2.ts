
import z, { ZodType } from "zod";
import axios from "axios"
import { payloadType } from "./middleware1.js";
import { txnStatusEnum } from "../../db/schema.js";
type txnStatus = (typeof txnStatusEnum.enumValues)[number];

type PayloadType = z.infer<typeof payloadType>;


export type generateNewTxnDetails={
    payer_upi_id : string,
    payee_upi_id : string,
    amount : number,
    gateway_id: string,
    payer_client_id : string,
    transaction_id: string,
    transaction_status: txnStatus,
    idempotency_key: string,
    idempotency_ttl: Date | string,
    orchestrator_id: string,
    priority:string,
    start_timestamp:Date | string
    worker_redis:string,
    outbox_status:string,
    current_routing_key:string
    transaction_flag:string
}


export async function checkforIdempotencyFields(Payload:PayloadType):Promise<Boolean>{

    const currentPayload = Payload;
    if(!currentPayload.idempotency_key) {
        console.log("idempotency_key not present : brand new transaction.");
        return false;
    }
    return true;
}

export async function fetchTransacitonDetails(payload:PayloadType): Promise<any> {

    const { idempotency_key  } = payload;

    if(!idempotency_key ) throw new Error("idempotency key and ttl are not destructured properly in the middleware2's fetchTransactionDetails function");
    
    // db call to get the details
    const response = await axios.post("http://orchestrator:3002/api/test/verifyIdempotencyFields",{
        idempotency_key:idempotency_key
    });

    
    return response;
}

export async function generateTransactionDetails(payload:PayloadType) : Promise<generateNewTxnDetails>{
        
        const { payer_upi_id , payee_upi_id , amount , gateway_id , payer_client_id }: PayloadType = payload;

        
        const transaction_id : string = `TXN_${crypto.randomUUID()}`;
        const idempotency_key : string = `KEY${crypto.randomUUID()}`;
        const idempotency_ttl: Date = new Date(Date.now() + 3600 * 1000)
        const transaction_status :txnStatus = "PENDING";
        const orchestrator_id :string = `ORCH${crypto.randomUUID()}`;
        const client_id : string= payer_client_id;
        const priority : string = '1';
        const start_timestamp : Date = new Date(Date.now())
        const worker_redis = `worker:trail:${transaction_id}`
        const outbox_status  = 'PENDING';
        const transaction_flag = 'NORMAL'

        const newGeneratedTxnDetails: generateNewTxnDetails = {
            payer_upi_id : payer_upi_id,
            payee_upi_id : payee_upi_id,
            amount : amount,
            idempotency_key: idempotency_key,
            idempotency_ttl: idempotency_ttl,
            transaction_id: transaction_id,
            gateway_id: gateway_id,
            payer_client_id : client_id,
            transaction_status: transaction_status,
            orchestrator_id: orchestrator_id,
            priority:priority,
            worker_redis:worker_redis,
            start_timestamp:start_timestamp,
            outbox_status:outbox_status,
            current_routing_key:'INITIATED',
            transaction_flag:transaction_flag
        }

    return newGeneratedTxnDetails;
}


// middleware 2

export async function txnInitMiddleware2 ( c:any , next:any ){

    console.log("------- Entering middleware 2 ------");

    const startT = performance.now();
    const payload : PayloadType = await c.req.json();
    try{
        await checkforIdempotencyFields(payload);
        const txnCheck = await fetchTransacitonDetails(payload);
        if(!txnCheck.success){
            const txn = await generateTransactionDetails(payload);
            console.log(txn);
            c.set('newTxn',txn);
            const endT = performance.now() - startT ;
            console.log("time taken to complete middleware 2 : ",endT);
            console.log("------ Exiting middleware 2 ------");
            return await next();
        }else{
            console.log("if we get the details we will attach them to the conetxt and fo next");
        c.set('newTxn',txnCheck.transaction);
        const endT = performance.now() - startT ;
        console.log("time taken to complete middleware 2 : ",endT);
        console.log("------ Exiting middleware 2 ------");
        return await next();
        }
        
        
    }catch(err:any){
        console.error("Error in txnInitMiddleware2:", err.message || err);
        const endT = performance.now() - startT ;
        console.log("time taken to complete middleware 2 : ",endT);
        console.log("------ Exiting middleware 2 ------");
        return c.json({ error: err.message || "Internal server error in middleware 2" }, 500);
        
    }


    
}