import amqp from "amqplib";
import { createWorker } from "../commonWorker.js";
import { registry, type registryQueueDetails } from "./registry.js";
import type { queueDetails } from "../../../config/rabbitmq.js";

export async function workersInitiation(
    channel: amqp.Channel,
    connection: amqp.ChannelModel,
    registry: registryQueueDetails[]
){
    

    await Promise.all(
        await registry.map( (Queue)=>{

            const { queue , prevQueue , nextQueue, process } = Queue;
            const queueDetails : queueDetails = {
               prevQueueRkey: prevQueue,
               currentQueueRkey : queue,
               nextQueueRkey: nextQueue,
               QueueProcessFunction: (data:any)=>{}
            }

            return createWorker(
                channel,
                queueDetails,
                connection,
                Queue.queue,
               
                process
            )
        } )
    )
}