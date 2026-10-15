import amqp, { Connection, Channel } from "amqplib";
import { handleTaskCompletion } from "../../services/gather-service.js";

// because if the ts dosent know exact type of connectino it cannot it wont allow any functions under connection.
type RabbitConnection = amqp.Connection & {
    createChannel: () => Promise<amqp.Channel>;
};

export async function verifyUpiIdWorker(connection: RabbitConnection) {
    const channel : Channel = await (connection as any).createChannel();
    const queueName = "verify-upi-id";

    await channel.prefetch(1);
    console.log(' verify-upi-id worker has started working  ');

    channel.consume( queueName, async( msg )=>{
        if(!msg) return;

        const data = JSON.parse(msg.content.toString());
        console.log(' verify-upi-id worker has received a message  ', data);

        const { upiId, taskId } = data;

        try{
            setTimeout(async()=>{
            await handleTaskCompletion(upiId,'upiResult', taskId, 2);
            }, 1000);

            channel.ack(msg);

        }catch(err){
            console.error('Error processing message in verify-upi-id worker:', err);
            channel.nack(msg, false, false); // Reject the message and do not requeue
        }
        

    }, {noAck:false} );
}