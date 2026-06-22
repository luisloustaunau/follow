import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, BUCKET } from '../lib/s3.js';
import { extractToken } from '../lib/jwt.js';
import { ok, unauthorized, serverError, badRequest } from '../lib/response.js';

/**
 * Two endpoints:
 *  - GET /fronts/:frontId/upload-url?filename=foo.jpg
 *      → { uploadUrl, key, contentType }
 *      Frontend uses PUT against uploadUrl to send the file body.
 *  - GET /uploads/view?key=foo
 *      → { url }      (presigned GET, 7 day expiry)
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') return ok({});

    const user = extractToken(
      event.headers?.Authorization ?? event.headers?.authorization
    );
    if (!user) return unauthorized();

    const path = event.resource ?? event.path;
    const qs = event.queryStringParameters ?? {};

    // ── Sign an upload (PUT) URL ─────────────────────────────────────
    if (path.endsWith('/upload-url')) {
      const frontId = event.pathParameters?.frontId;
      if (!frontId) return badRequest('frontId required');
      const filename = qs.filename ?? 'photo.jpg';
      const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `fronts/${frontId}/${Date.now()}-${safe}`;
      const contentType = guessContentType(safe);
      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn: 60 * 10 } // 10 min
      );
      return ok({ uploadUrl, key, contentType });
    }

    // ── Sign a view (GET) URL ────────────────────────────────────────
    if (path.endsWith('/view') || path.endsWith('/uploads/view')) {
      const key = qs.key;
      if (!key) return badRequest('key required');
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: 60 * 60 * 24 * 7 } // 7 days
      );
      return ok({ url });
    }

    return badRequest('Unknown upload route');
  } catch (err) {
    return serverError(err);
  }
}

function guessContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}
