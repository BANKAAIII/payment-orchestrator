import { Hono } from "hono";
import { getRabbitMQChannel } from "../config/rabbitmq.js";
import { clientReqSchema } from "../db/schema.js";
import { json } from "stream/consumers";
import { transactionInterface } from "../types/clientRoutes/index.js";

export interface clientReqInitiateSchemaType{
    payer_upi_id : string,
    payee_upi_id : string,
    amount : number , 
    idempotency_key : string,
    idempotency_ttl : string,
    gateway_id: string
}

 const transactionRoutes = new Hono();

transactionRoutes.post( '/stresstest' , async(c)=>{
    console.log("entered the route")
    const body: clientReqInitiateSchemaType = await c.req.json();
    const { payer_upi_id, payee_upi_id, amount, idempotency_key, idempotency_ttl, gateway_id } : transactionInterface = body;

    const orchestratorId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const routingKey = 'INITIATED';

    const payload = JSON.stringify({
            orchestratorId,
            payer_upi_id,
            payee_upi_id,
            amount,
            gateway_id,
            idempotencyKey: idempotency_key || orchestratorId,
            timestamp: Date.now()
        });

        try{
            const channel = await getRabbitMQChannel();
        channel.publish('transaction', routingKey, Buffer.from(payload),{
            persistent:true,
            contentType:'application/json'
        });

        return c.json({success:'true',orchestratorId},{status:202});
        }catch(err){
            throw new Error("error ");
        }

        
})


export default transactionRoutes;