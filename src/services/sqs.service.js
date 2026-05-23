import {SQSClient, SendMessageCommand} from "@aws-sdk/client-sqs"
import logger from "../utils/logger.js";

const sqsService = new SQSClient({
    region: "us-east-1",
    endpoint: "http://localhost:4566",

    credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
    },
});

export async function enqueueEmail(payload) {

    console.log("QUEUE URL:");
    console.log(JSON.stringify(process.env.EMAIL_QUEUE_URL));

    const message = new SendMessageCommand({
        QueueUrl: process.env.EMAIL_QUEUE_URL,
        MessageBody: JSON.stringify(payload),
    });

    const result = await sqsService.send(message);

    console.log(result);

    logger.info("Queue Email Job.");
}
