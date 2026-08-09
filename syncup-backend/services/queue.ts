import amqplib, { Connection, Channel } from "amqplib";

/**
 * Global variables to hold active RabbitMQ connection and communication channel
 */
let connection: any = null;
let channel: any = null;

/**
 * CONNECT TO RABBITMQ MESSAGE QUEUE SERVER
 * 
 * WHAT IS A MESSAGE QUEUE?
 * RabbitMQ is a message broker. It allows our server to send tasks (like resume AI matching) 
 * into a durable queue, where background workers pick them up and process them asynchronously.
 */
export const connectQueue = async () => {
  try {
    const rabbitMqUrl = process.env.RABBITMQ_URL;
    if (!rabbitMqUrl) {
      throw new Error("RABBITMQ_URL is missing in environment variables");
    }

    // 1. Establish TCP connection to CloudAMQP / RabbitMQ server
    connection = (await amqplib.connect(rabbitMqUrl)) as any;
    
    // 2. Open a virtual communication channel inside the connection
    channel = (await connection!.createChannel()) as any;
    
    // 3. Declare queue name `job_matching_queue_v2` (durable = true means tasks survive server restarts)
    await channel.assertQueue("job_matching_queue_v2", {
      durable: true,
    });

    console.log("✅ RabbitMQ Connected & Queue 'job_matching_queue_v2' verified!");
  } catch (error) {
    console.error("❌ RabbitMQ Connection Error:", error);
  }
};

/**
 * HELPER: Push a JSON payload message into a specified RabbitMQ queue
 */
export const sendToQueue = async (queue: string, data: any): Promise<boolean> => {
  if (!channel) {
    console.error("❌ Cannot push message: No active RabbitMQ channel available!");
    return false;
  }
  
  // Convert JS data object to Buffer bytes and push to queue
  return channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
};

/**
 * HELPER: Retrieve active RabbitMQ channel for background worker consumption
 */
export const getChannel = () => channel;
