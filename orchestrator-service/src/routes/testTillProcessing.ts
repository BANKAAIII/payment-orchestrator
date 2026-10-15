import { Hono } from "hono";
import { getRabbitMQChannel } from "../config/rabbitmq.js";
import { clientReqSchema } from "../db/schema.js";
import { json } from "stream/consumers";
import { transactionInterface } from "../types/clientRoutes/index.js";
import transactionRoutes from "./brokertestPayment.js";
import { txnInitMiddleware1 } from "../middlewares/txnInitiation/middleware1.js";

// this route is testing and building phase 
// Client -> server( initial tests before entering msg broker ) -> rabbitMQ ( msg broker for internal services )'

// actions
// 1. payload & its type verification & idempotency key and ttl verification ( Middleware 1 )
// 4. if idempotency jey and ttl exists ( cleanup the data and route to the middleware 3  ) ( middleware 2)
// 2. getting a redlock , generating a txn.Id , and status ( Middleware 3 )
// 3. write the ledger,txn databases and outbox database ( Route logic )

transactionRoutes.post("/ttp" ,txnInitMiddleware1, async(c)=>{
    return c.json({message:"successfull till middleware 1 , check logs for more detailed information"},{status:200});
} )