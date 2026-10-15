import amqp from "amqplib";

import { BINDINGS, type exchangeInterface , type queueBindingsInterface, type queueInterface } from "../config/rabbitmq.js";

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq' ;

const sleep = (ms:number) => new Promise( (res)=> setTimeout(res,ms) )

export async function setupGracefulShutdown(connection: amqp.Connection, channel: amqp.Channel) {
    const shutdown = async (signal: string) => {
        console.log(`Received ${signal}. Starting graceful shutdown...`);
        
        try {
            // 1. Close the channel first (stop consuming)
            await channel.close();
            // 2. Close the connection
            await (connection as any).close();
            console.log("RabbitMQ connection closed safely.");
            process.exit(0);
        } catch (err) {
            console.error("Error during graceful shutdown:", err);
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function ensureConnection (){
    let totalTries = 20;
    while (totalTries>0){
        try{
            console.log("attempting to connect to rabbitMQ.");
            const connection = await amqp.connect(RABBITMQ_URL);
            console.log("tcp connection to rabbitMQ is established");
            const channel = await connection.createChannel();
            console.log("channel connection established");

            return { channel , connection }
        }catch(err){
            console.log("connection refusedd",err);
            console.log("retrying in 5 sec");
            console.log("total tries :",totalTries);
            totalTries -= 1;
            await sleep(5000);
        }
        
    }
    throw new Error("could not connect to rabbit mq , enseure connection function failed after reaching maximum attempts")
}



export async function createMessageBus(){
  const {channel , connection} = await ensureConnection();

  // inatilize exchanges required
  await exchangesInitiation(channel, [
    {name:"payments_exchange",type:'direct', routingKey:"payments_exchange_Key"},
    {name:"dlq_exchange",type:'direct' , routingKey:"dlq_exchange_key"},
    
    ]);

  await queuesInitiation(channel,[
        {name:"txn.initiation"},
        {name:"txn.validation"},
        {name:"txn.processing"},
        {name:"txn.ledgered"},
        {name:"txn.failed"},
        {name:"txn.complete"}
    ])

  await creatingBindings(channel , BINDINGS);
  return { channel , connection }
}

// creating bindings for the queues
export async function creatingBindings(
    channel:amqp.Channel,
    queueBindings:queueBindingsInterface[]
){
    await Promise.all(
        queueBindings.map( async(binding)=>{
            await Promise.all(
                 binding.exchanges.map( async(ex)=>{
                await channel.bindQueue(binding.queue.name , ex.name , ex.routingKey);
                
            } )
            )
           
        } )
    )
}

// initiating queues
export async function queuesInitiation(
    channel:amqp.Channel,
    queues:queueInterface[]
){
   await Promise.all(
     queues.map( async(queue)=>{
        try{
            // queue creation
            console.log(`creating queue ${queue.name}`);
            await channel.assertQueue(queue.name , {durable:true});
            console.log(`queue ${queue.name} created`);
        }catch(err){
            console.log("queue creation failed ",err)
            throw new Error("queue creation failed");
        }
        
    } )
   ) 
}




// Initiating exchanges.
export async function exchangesInitiation(
    channel:amqp.Channel,
    exchanges:exchangeInterface[]
){
   await Promise.all(
        exchanges.map( async(exchange)=>{
            
            try{
                await channel.assertExchange(exchange.name, exchange.type , {durable:true});
                console.log(`exchange ${exchange.name} is ready and ready for use !`);
            }catch(err){
                console.log(`exchange ${exchange.name} failed to be initiated`);
                throw new Error(`${exchange.name} initiation failed`);
            }
            
        } )
    )
}




export async function publishEvent( channel:amqp.Channel , exchange:string , rountingKey:string , message:any ){
    channel.publish( exchange , rountingKey , Buffer.from(JSON.stringify(message)) );

}


export async function suscribeEvent( channel : amqp.Channel , exchange:string, routingKey:string , queue:string , callback : (msg:any)=> void ){
    await channel.assertExchange( exchange , 'direct' , {durable:false} );
    const q = await channel.assertQueue( queue , {durable:false}  );

    await channel.bindQueue(q.queue , exchange , routingKey);

   channel.consume(q.queue, (msg) => {
    if (msg) {
      callback(JSON.parse(msg.content.toString()));
      channel.ack(msg);
    }
  });
  
}