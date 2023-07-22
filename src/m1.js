import express from "express";
import amqp from "amqplib";
import winston from "winston";

// Logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/m1.log" }),
  ],
});

// Express app
const app = express();
app.use(express.json());

// RabbitMQ connection
const rabbitMQUrl = "amqp://localhost";
const queueName = "tasks";

const connectToRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName);

    // Process the task (your logic here)
    const processTask = (task) => {
      // Example logic: Append "Hello, " to the task
      return `Hello, ${task}`;
    };

    channel.consume(queueName, async (message) => {
      const task = message.content.toString();
      logger.info(`Received task: ${task}`);
      
      // Process the task
      const result = processTask(task);

      // Send the result back to M1
      channel.sendToQueue(message.properties.replyTo, Buffer.from(result), {
        correlationId: message.properties.correlationId,
      });

      channel.ack(message);
      logger.info(`Sent result: ${result}`);
    });
  } catch (error) {
    logger.error(`Failed to connect to RabbitMQ: ${error}`);
  }
};

// Start the server
const port = 3000;
app.listen(port, () => {
  logger.info(`M1 microservice is running on port ${port}`);
  connectToRabbitMQ();
});