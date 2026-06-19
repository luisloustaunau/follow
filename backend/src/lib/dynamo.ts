import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const raw = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

export const dynamo = DynamoDBDocumentClient.from(raw);
export const TABLE = process.env.TABLE_NAME ?? 'anma-follow';
