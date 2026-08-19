#!/usr/bin/env node
/**
 * One-shot password reset for a user in the `anma-follow` table.
 *
 * Hashes the new password with bcryptjs (10 rounds — same as auth.ts)
 * and overwrites the `passwordHash` attribute on USER#<email> / #META.
 *
 * Usage:
 *   node scripts/reset-password.mjs <email> <newPassword>
 *   node scripts/reset-password.mjs luis@anma.mx 'Anma2026!'
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const TABLE = process.env.TABLE_NAME ?? 'anma-follow';

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("Usage: node scripts/reset-password.mjs <email> '<newPassword>'");
  process.exit(1);
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function main() {
  const key = { PK: `USER#${email}`, SK: '#META' };

  const existing = await dynamo.send(new GetCommand({ TableName: TABLE, Key: key }));
  if (!existing.Item) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: key,
      UpdateExpression: 'SET passwordHash = :h',
      ExpressionAttributeValues: { ':h': passwordHash },
    })
  );

  // Verify round-trip with the same compare the login handler uses
  const check = await bcrypt.compare(newPassword, passwordHash);

  console.log('--- password reset complete ---');
  console.log(JSON.stringify({ email, name: existing.Item.name, role: existing.Item.role, verify: check }, null, 2));
}

main().catch((e) => {
  console.error('reset failed:', e);
  process.exit(1);
});
