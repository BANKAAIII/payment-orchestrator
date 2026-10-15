export interface registryQueueDetails{
    queue:string,
    prevQueue: string | null,
    nextQueue: string | null,
    process: (data:any)=>Promise<any> | void
}

export const registry : registryQueueDetails[]= [ 
    {
        queue:"txn.initiation",
        prevQueue:null,
        nextQueue:"txn.validation",
        process:()=>{}
    },
    {
        queue:"txn.validation",
        prevQueue:"txn.init",
        nextQueue:"txn.processing",
        process:()=>{}
    },
    {
        queue:"txn.processing",
        prevQueue:"txn.validation",
        nextQueue:"txn.ledgered",
        process:()=>{}
    },
    {
        queue:"txn.ledgered",
        prevQueue:"txn.processing",
        nextQueue:"txn.complete",
        process:()=>{}
    },
    {
        queue:"txn.failed",
        prevQueue:null,
        nextQueue:null,
        process:()=>{}
    },
    {
        queue:"txn.complete",
        prevQueue:"txn.processing",
        nextQueue:null,
        process:()=>{}
    },
    
 ]