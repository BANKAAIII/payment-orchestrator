import ampq from "amqplib"

export interface exchangeInterface{
    name: string,
    type: 'direct' | 'fanout' | 'topic',
    routingKey: string
}

export interface queueInterface{
    name:string,
    
}

export interface queueBindingsInterface{
    queue : queueInterface
    exchanges : exchangeInterface[]
}

export interface bindingInterface {
    queue:{name:string},
    exchanges:exchangeInterface[]

}

export interface msg{
    hopCount: number
}

export const BINDINGS : bindingInterface[] =[
    {
        queue:{name:"DLQ"},
        exchanges:[
        { name:"payments_exchange",type:'direct', routingKey:"payments_exchange_Key" }
        ]
    },
    {
        queue:{name:"txn.initiation"},
        exchanges:[
        { name:"payments_exchange",type:'direct', routingKey:"txn_initiation_rkey" }
        ]
    },
    {
        queue:{name:"txn.validation"},
        exchanges:[
        { name:"payments_exchange",type:'direct', routingKey:"txn_validation_rKey" }
        ]
    },
    {
        queue:{name:"txn.processing"},
        exchanges:[
        { name:"payments_exchange",type:'direct', routingKey:"txn_processing_Key" }
        ]
    },
    {
        queue:{name:"txn.ledgered"},
        exchanges:[
        { name:"payments_exchange",type:'direct', routingKey:"txn_ledgered_Key" }
        ]
    },
    {
        queue:{name:"txn.failed"},
        exchanges:[
        { name:"payments_exchange",type:'direct', routingKey:"txn_failed_Key" }
        ]
    },
    {
        queue:{name:"txn.complete"},
        exchanges:[
        { name:"payments_exchange",type:'direct', routingKey:"txn_complete_Key" }
        ]
    }
  ]

  export type workerStatus = 'success' | 'failed' | 'retry' | 'prev' | 'working'

  export interface metaAttachedDataInterface{
    payload:any,
    meta:{
        createdAt:Date,
        hopCount:number,
        currentQueue:string,
        workerSatus:workerStatus
        }
  }

  export interface queueDetails{
    prevQueueRkey:string | null,
    currentQueueRkey:string,
    nextQueueRkey:string | null,
    QueueProcessFunction: (data:any)=> Promise<any> | void
  }

  export type transactionStageType = 'INITIATED' | 'VALIDATED' | 'PROCESSING' | 'LEDGERED' | 'COMPLETE' | 'FAILED' ;

  export interface transactionInterface{
        status : transactionStageType,
        meta:{
            hash: string,       // proof that transaction is not injected.
            traceId: string,    // like a pointer to a stage of transaction.
            currentQueueRkey : string,
            nextQueueRKey : string,
            prevQueueRKey : string,
        },
        payload : {
            status : transactionStageType ,
            amount : number,
            senderAccount : string,
            recieverAccount : string,
            transactionId : string,     // like a pointer to the transaction itself.
            startTime : number
        }
  }
