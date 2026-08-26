#!/usr/bin/env node
/**
 * One-shot backfill for USER items so the admin panel can list them.
 *
 * Adds to every `USER#<email>` / `#META` item:
 *   GSI1PK = 'USER'      → lets GET /auth/users query the index
 *   GSI1SK = <email>     → stable sort key
 *   active = true        → only if the attribute is missing
 *
 * Never touches passwordHash. Idempotent — safe to run repeatedly.
 *
 * Usage:  node scripts/backfill-users.mjs
 */
import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const TABLE = process.env.TABLE_NAME ?? 'anma-follow';

const client = new DynamoDBClient({ region: REGION });

async function* scanUsers() {
  let lastKey;
  do {
    const resp = await client.send(
      new ScanCommand({
        TableName: TABLE,
        ExclusiveStartKey: lastKey,
        FilterExpression: 'begins_with(PK, :u) AND SK = :meta',
        ExpressionAttributeValues: marshall({ ':u': 'USER#', ':meta': '#META' }),
        ProjectionExpression: 'PK, SK, email, GSI1PK, active',
      })
    );
    for (const item of resp.Items ?? []) yield item;
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);
}

async function main() {
  let updated = 0;
  let alreadyOk = 0;

  for await (const raw of scanUsers()) {
    const pk = raw.PK?.S;
    const sk = raw.SK?.S;
    // Fall back to deriving the email from the PK if the attribute is absent.
    const email = raw.email?.S ?? String(pk ?? '').replace('USER#', '');

    const needsGsi = raw.GSI1PK?.S !== 'USER';
    const needsActive = raw.active === undefined;

    if (!needsGsi && !needsActive) {
      alreadyOk += 1;
      console.log(`  ok       ${email}`);
      continue;
    }

    await client.send(
      new UpdateItemCommand({
        TableName: TABLE,
        Key: marshall({ PK: pk, SK: sk }),
        // if_not_exists keeps an existing `active: false` intact.
        UpdateExpression:
          'SET GSI1PK = :t, GSI1SK = :e, active = if_not_exists(active, :true)',
        ExpressionAttributeValues: marshall({
          ':t': 'USER',
          ':e': email,
          ':true': true,
        }),
      })
    );

    updated += 1;
    console.log(`  updated  ${email}`);
  }

  console.log('\n--- user backfill complete ---');
  console.log(`  updated:    ${updated}`);
  console.log(`  already ok: ${alreadyOk}`);

  if (updated + alreadyOk === 0) {
    console.warn('\n⚠️  No USER items found. Is TABLE_NAME correct?');
  }
}

main().catch((e) => {
  console.error('backfill failed:', e);
  process.exit(1);
});
