import { Hono } from "hono";
import { getRabbitMQChannel } from "../config/rabbitmq.js";
import { connectRabbitMQ } from "../config/rabbitmq.js";
import { transactionSchema } from "../db/schema.js";
import { json } from "stream/consumers";
import { transactionInterface } from "../types/clientRoutes/index.js";
import amqp from "amqplib";
import transactionRoutes from "./brokertestPayment.js";
import { txnInitMiddleware1 } from "../middlewares/txnInitiation/middleware1.js";
import { generateNewTxnDetails, txnInitMiddleware2 } from "../middlewares/txnInitiation/middleware2.js";
import { txnInitMiddleware3 } from "../middlewares/txnInitiation/middleware3.js";

// this route is testing and building phase 
// Client -> server( initial tests before entering msg broker ) -> rabbitMQ ( msg broker for internal services )'

// actions
// 1. payload & its type verification & idempotency key and ttl verification ( Middleware 1 )
// 4. if idempotency jey and ttl exists ( cleanup the data and route to the middleware 3  ) ( middleware 2)
// 2. getting a redlock , generating a txn.Id , and status ( Middleware 3 )
// 3. write the ledger,txn databases and outbox database ( Route logic )

export async function publishToRabbitMq(channel:amqp.Channel , exchangeName:string , routingKey:string , payload:generateNewTxnDetails){
    try{
        const msgBuffer = Buffer.from(JSON.stringify(payload));
        const published = channel.publish(
            exchangeName,
            routingKey,
            msgBuffer,
            { persistent: true }
        )

        if (published) {
            console.log(`[RabbitMQ] Event successfully sent with routing key: ${routingKey}`);
            return true;
        } else {
            console.error(`[RabbitMQ] Channel write queue full or buffer saturated for key: ${routingKey}`);
            return false;
        }


    }catch(err){
        console.error("[RabbitMQ] Failed to publish message:", err);
        throw err;
    }
}

transactionRoutes.post("/ttp" ,txnInitMiddleware1,txnInitMiddleware2,txnInitMiddleware3, async(c:any)=>{
    console.log("----- Entering Route -----");
    const payload :generateNewTxnDetails = c.get('newTxn');
    
    if(!payload){ return c.json({
        msg:"no payload in route"
    },400) }


    const channel = await getRabbitMQChannel();
    
    const priority = Number(payload.priority);
    let lane:string;

    if(priority === 1 || priority === 2){
        lane = 'slow';
    }else if( priority >2 && priority <= 4 ){
        lane='std'
    }else if(priority >4 && priority<=7){
        lane='fast'
    }else{
        lane='std'
    }

    let routingKey:string = payload.current_routing_key

    const publishR = await publishToRabbitMq(channel,'transaction',`txn.${routingKey}.${lane}`,payload)

    return c.json({
        status:"txnAccepted",
        detail:"1 Direct attempt to reach rabbitmq & outbox confirm write"
    },202);
} )