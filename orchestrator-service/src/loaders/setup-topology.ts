import amqp from "amqplib";

export interface queueInterface{
    name: string;
    routing_key: string;
}

export async function setupTopology(channel: amqp.Channel) {

    // EXCHANGES
    const p_exchange = 'transaction';

    //ROUTINGkEYS :

    const ROUTING_KEY_INITIATED  = 'INITIATED' ;
    const ROUTING_KEY_PROCESSING = 'PROCESSING';

    // creating exchanges
    await channel.assertExchange( p_exchange , 'topic' , { durable: true } );
    console.log(`Exchange ${p_exchange} created successfully`);

    // QUEUES ( WORKERS )
    const queues : queueInterface[] = [

        {name:'verify-upi-id', routing_key:ROUTING_KEY_INITIATED},
        {name:'check-wallet-balance', routing_key:ROUTING_KEY_INITIATED},
        {name:'generate-transaction-id', routing_key:ROUTING_KEY_INITIATED}
    ];


    // create these queues
    for( const queue of queues ){
        await channel.assertQueue( 
            queue.name ,
            {
                durable : true,
                arguments: {
                'x-dead-letter-exchange' : 'dlq-name' }
            }
         )
        console.log(`Queue ${queue.name} created successfully`);
    };

    //bind queues to exchange with routing keys
    for( const queue of queues ){
        await channel.bindQueue( queue.name , p_exchange , queue.routing_key );
        console.log(`Queue ${queue.name} bound to exchange ${p_exchange} with routing key ${queue.routing_key}`);
    };
    
}
