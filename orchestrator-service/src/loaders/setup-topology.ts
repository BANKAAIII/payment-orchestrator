import amqp from "amqplib";

export interface queueInterface{
    name: string;
    routing_key: string;
}

export async function setupTopology(channel: amqp.Channel) {

    // EXCHANGES
    const dlxExchange = 'transaction.dlx'
    const p_exchange = 'transaction';

    //ROUTINGkEYS :
    
    const dlqRoutingKey = 'dlq.dead';
    const dlqQueue = 'transaction.dlq'


    // Dead-letter exchange
    await channel.assertExchange( dlxExchange , 'direct' , {durable:true} );
    await channel.assertQueue(dlqQueue,{durable:true});
    await channel.bindQueue(dlqQueue,dlxExchange,dlqRoutingKey);

    console.log(`Created queue ${dlqQueue} and binded it to exchange ${dlxExchange} with routingkey ${dlqRoutingKey}`)
    const dlxArguments = {
        "x-dead-letter-exchange" : dlxExchange,
        "x-dead-letter-routing-key" : dlqRoutingKey
    }
    
    // creating exchanges
    await channel.assertExchange( p_exchange , 'topic' , { durable: true } );
    console.log(`Exchange ${p_exchange} created successfully`);

    // QUEUES ( WORKERS )

    const stages = ['INITIATED' , 'PROCESSING' , 'PENDING' , 'SUCCESS' , 'FAILED' , 'REFUND' ];
    const lanes = [
        { name:'fast' , priority:10 , suffix:'fast' },
        { name:'std' , priority:7 , suffix:'std' },
        { name:'slow' , priority:3 , suffix:'slow' }
    ]



    // create queues
    for ( const stage of stages ){
        for (const lane of lanes){
            const queueName = `transaction.${stage}.${lane.name}.queue`;
            const routingKey = `txn.${stage}.${lane.name}`;

            await channel.assertQueue( queueName, {
                durable:true,
                arguments:{
                    ...dlxArguments,
                   'x-max-priority':lane.priority
                    }
            } );
            await channel.bindQueue(queueName,p_exchange,routingKey);
            console.log(`Created queue ${queueName} and binded it to exchange ${p_exchange} with routingkey ${routingKey}`);
        }
        
    }
}
