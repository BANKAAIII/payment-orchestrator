import amqp, { Connection, Channel } from "amqplib";

type RabbitConnection = amqp.Connection & {
    createChannel: () => Promise<amqp.Channel>;
};

export async function worker1( connection:RabbitConnection ){
    // Check the txn.status = sus , normal , blocked
    
    // Check pre reqs : redis_key ,
    // Check worker_count < max_worker_count
    // Check route_key === INITIATED
}
