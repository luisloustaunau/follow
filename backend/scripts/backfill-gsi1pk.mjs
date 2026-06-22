#!/usr/bin/env node
/**
 * One-shot backfill: tags every existing item in the `anma-follow` DynamoDB
 * table with the right GSI1PK discriminator so the new global aggregate
 * endpoints (/reports, /estimations) can find them.
 *
 * Type derivation rules:
 *   PK PROJECT#  + SK '#META'        → PROJECT
 *   PK PROJECT#  + SK FRONT#         → FRONT
 *   PK FRONT#    + SK REPORT#        → REPORT
 *   PK PROJECT#  + SK ESTIMATION#    → ESTIMATION
 *   anything else (USER, SCHEDULE…)  → skipped
 *
 * Idempotent: items that already have the correct GSI1PK are skipped.
 *
 * Usage:  node scripts/backfill-gsi1pk.mjs
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

function classify(pk, sk) {
  const PK = String(pk ?? '');
  const SK = String(sk ?? '');
  if (PK.startsWith('PROJECT#') && SK === '#META') return 'PROJECT';
  if (PK.startsWith('PROJECT#') && SK.startsWith('FRONT#')) return 'FRONT';
  if (PK.startsWith('FRONT#') && SK.startsWith('REPORT#')) return 'REPORT';
  if (PK.startsWith('PROJECT#') && SK.startsWith('ESTIMATION#')) return 'ESTIMATION';
  return null;
}

async function* scanAll() {
  let lastKey;
  do {
    const resp = await client.send(
      new ScanCommand({
        TableName: TABLE,
        ExclusiveStartKey: lastKey,
        ProjectionExpression: 'PK, SK, GSI1PK',
      })
    );
    for (const item of resp.Items ?? []) yield item;
    lastKey = resp.LastEvaluatedKey;
  } while (lastKey);
}

async function main() {
  const counts = { PROJECT: 0, FRONT: 0, REPORT: 0, ESTIMATION: 0, skipped: 0, alreadyOk: 0 };

  for await (const raw of scanAll()) {
    const pk = raw.PK?.S;
    const sk = raw.SK?.S;
    const existing = raw.GSI1PK?.S;
    const type = classify(pk, sk);
    if (!type) {
      counts.skipped += 1;
      continue;
    }
    if (existing === type) {
      counts.alreadyOk += 1;
      continue;
    }
    await client.send(
      new UpdateItemCommand({
        TableName: TABLE,
        Key: marshall({ PK: pk, SK: sk }),
        UpdateExpression: 'SET GSI1PK = :t',
        ExpressionAttributeValues: marshall({ ':t': type }),
      })
    );
    counts[type] += 1;
    if ((counts.PROJECT + counts.FRONT + counts.REPORT + counts.ESTIMATION) % 25 === 0) {
      process.stdout.write('.');
    }
  }

  console.log('\n--- backfill complete ---');
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((e) => {
  console.error('backfill failed:', e);
  process.exit(1);
});
