import amqp from "amqplib";
import winston from "winston";

// Logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/m2.log" }),
  ],
});

// RabbitMQ connection
const rabbitMQUrl = "amqp://localhost";
const queueName = "tasks";
const resultQueueName = "results";

const connectToRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName);
    await channel.assertQueue(resultQueueName);

    // Process the task (your logic here)
    const processTask = (task) => {
      // Example logic: Add "Processed" prefix to the task
      return `Processed ${task}`;
    };

    channel.consume(queueName, async (message) => {
      const task = message.content.toString();
      logger.info(`Received task: ${task}`);

      // Process the task
      const result = processTask(task);

      // Send the result to the result queue
      channel.sendToQueue(resultQueueName, Buffer.from(result), {
        correlationId: message.properties.correlationId,
      });

      channel.ack(message);
      logger.info(`Sent result: ${result}`);
    });
  } catch (error) {
    logger.error(`Failed to connect to RabbitMQ: ${error}`);
  }
};

// Start the microservice
connectToRabbitMQ();