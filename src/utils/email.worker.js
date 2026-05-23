import "dotenv/config";

import {
    SQSClient,
    ReceiveMessageCommand,
    DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import logger from "./logger.js";

const sqs = new SQSClient({
    region: "us-east-1",
    endpoint: "http://localhost:4566",
    credentials: {accessKeyId: "test", secretAccessKey: "test",},
});

const QUEUE_URL = process.env.EMAIL_QUEUE_URL;

async function pollMessages() {

    while (true) {
        const response = await sqs.send(
            new ReceiveMessageCommand({
                QueueUrl: QUEUE_URL,
                MaxNumberOfMessages: 1,
                WaitTimeSeconds: 20,
            })
        );

        const messages = response.Messages || [];
        for (const message of messages) {
            try {
                const body = JSON.parse(message.Body);
                console.log("Processing:", body);
                await new Promise(r => setTimeout(r, 2000));

                console.log("Email sent to:", body.email);

                await sqs.send(
                    new DeleteMessageCommand({
                        QueueUrl: QUEUE_URL,
                        ReceiptHandle:
                        message.ReceiptHandle,
                    })
                );
                logger.info("Message deleted");

            } catch (err) {
                console.error("Worker failed:", err);
            }
        }
    }
}

pollMessages();