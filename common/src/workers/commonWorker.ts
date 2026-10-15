import amqp, { type ChannelModel } from "amqplib";
import { publishEvent } from "../../lib/messageBus.js";
import type { workerStatus,metaAttachedDataInterface, queueDetails } from "../../config/rabbitmq.js";
import { timeStamp } from "console";

async function attachMeta(
    payload:any,
    meta:{ 
        createdAt:Date,
        hopCount:number,
        currentQueue:string,
        workerStatus:workerStatus
    }
   
):Promise<metaAttachedDataInterface>{
    return {
        payload:payload,
        meta: payload._meta || {
            traceId:crypto.randomUUID,
            createdAt:meta.createdAt,
            workerSatus:meta.workerStatus,
            hopCount:meta.hopCount,
            issuedAtQueue:meta.currentQueue
        }
    }
};


 function hopCheck(hopCount:number){
    if (hopCount < 20){
        hopCount += 1;
        return true;
    }else {
        return false;
    }
}



export async function createWorker(
    channel: amqp.Channel,
    queueDetails:queueDetails,
    connection: ChannelModel,
    
    currentQueue:string ,
    
    processFunction:(data:any | null)=> Promise<any> | void
){
    await channel.prefetch(1);
    const consumerInfo = await channel.consume( queueDetails.currentQueueRkey, async(Msg:any)=>{

        if(!Msg) return ;
        const startTime = Date.now();

        if(!queueDetails.prevQueueRkey || !queueDetails.nextQueueRkey) throw new Error ("prev || next routing key is missing");

        try{
            const data = JSON.parse( Msg.content.toString() );
            const decoratedData = await attachMeta(data,{ createdAt:new Date(startTime), hopCount:0 , currentQueue:queueDetails.currentQueueRkey, workerStatus:'working' });
            
            // processData : atcual function which will carryout the transaction logic.
            // process must include : (success:boolean) , (data:object<queueType>) 
            const result:{success:boolean,data:any} = await processFunction(decoratedData);

            if(result.success){
                // create a traceId.
                const traceId = crypto.randomUUID();

                // calculate details ( elapsedTime , queue ).
                let timetaken = startTime-Date.now();

                const telemetricDetails = {
                    traceId:traceId,
                    elapsedTime:timetaken,
                    queue:queueDetails.currentQueueRkey
                }

                // send the details to the backend.
                
                // send data to the next queue.
                await publishEvent(channel,'payments_exchange', queueDetails.nextQueueRkey ,data);
                console.log("passed on to next queue");
                // acknowledge and close the event in the queue.
                channel.ack(Msg);
            }else{
                 // create a traceId.
                 const traceId = crypto.randomUUID();
                // calculate details ( elapsedTime , queue ).
                let timetaken = startTime-Date.now();

                const telemetricDetails = {
                    traceId:traceId,
                    elapsedTime:timetaken,
                    queue: queueDetails.currentQueueRkey
                }

                // check hopCount if < limit - continue else push to txn.failed queue
                const canHop:boolean = hopCheck(decoratedData.meta.hopCount);

                if(canHop === true){
                    // route the request for the next expected queue.
                    await publishEvent(channel,'payments_exchange',queueDetails.prevQueueRkey,data);
                    console.log("passed on to prev queue");
                    console.log("published to next queue after checking hopcount");

                    // ack the MSg
                     channel.ack(Msg);
                }else{
                    await publishEvent(channel,'payments_exchange','txn.failed',data);
                    console.log("due to hopCount being over limit transaction is pushed to txn.failed");
                    channel.ack(Msg);
                }
                // route the request for the next expected queue.
                
            }
            

        }catch(e){
            console.log("error",e)
        }
        
    }

);

return {
            stop: async ()=>{
                await channel.cancel(consumerInfo.consumerTag);
                console.log(`worker stopped on ${currentQueue}`);
            }
        }
    
}