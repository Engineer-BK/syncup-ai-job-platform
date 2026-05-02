import amqplib, { Connection, Channel } from "amqplib";

let connection: any = null;
let channel: any = null;

export const connectQueue = async () => {
  try {
    const rabbitMqUrl = process.env.RABBITMQ_URL;
    if (!rabbitMqUrl) {
      throw new Error("RABBITMQ_URL is missing in environment variables");
    }

    connection = (await amqplib.connect(rabbitMqUrl)) as any;
    channel = (await connection!.createChannel()) as any;
    
    await channel.assertQueue("job_matching_queue_v2", {
      durable: true,
    });
    console.log("RabbitMQ Connected & Queue created");
  } catch (error) {
    console.error("RabbitMQ Connection Error:", error);
  }
};

export const sendToQueue = async (queue: string, data: any) => {
  if (!channel) {
    console.error("No RabbitMQ channel available.");
    return false;
  }
  return channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
};

export const getChannel = () => channel;
