import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { dynamo, TABLE } from '../lib/dynamo.js';
import { signToken, extractToken } from '../lib/jwt.js';
import { ok, unauthorized, forbidden, badRequest, notFound, serverError } from '../lib/response.js';

const VALID_ROLES = ['owner', 'supervisor', 'billing'];
const MIN_PASSWORD_LENGTH = 8;

/** Counts USER items. Used to allow the very first owner to bootstrap. */
async function countUsers(): Promise<number> {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :t',
      ExpressionAttributeValues: { ':t': 'USER' },
      Select: 'COUNT',
    })
  );
  return res.Count ?? 0;
}

/** Strips passwordHash and other sensitive fields before returning a user. */
function publicUser(item: Record<string, unknown>) {
  return {
    id: item.id,
    name: item.name,
    email: item.email,
    role: item.role,
    active: item.active !== false,
    createdAt: item.createdAt,
    createdBy: item.createdBy ?? null,
    lastPasswordResetAt: item.lastPasswordResetAt ?? null,
  };
}

function callerFrom(event: APIGatewayProxyEvent) {
  return extractToken(event.headers?.Authorization ?? event.headers?.authorization);
}

/**
 * Extracts the email from paths like /auth/users/{email}
 * or /auth/users/{email}/reset-password.
 * The route is a {proxy+} catch-all, so pathParameters is not populated.
 */
function emailFromPath(path: string): string | null {
  const parts = path.split('/').filter(Boolean); // ['auth','users','a@b.mx',...]
  const idx = parts.indexOf('users');
  if (idx === -1 || !parts[idx + 1]) return null;
  return decodeURIComponent(parts[idx + 1]);
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const path = event.path;
    const method = event.httpMethod;

    if (method === 'OPTIONS') return ok({});

    // ---------------------------------------------------------------
    // POST /auth/login  (public)
    // ---------------------------------------------------------------
    if (method === 'POST' && path.endsWith('/login')) {
      const body = JSON.parse(event.body ?? '{}');
      const { email, password } = body;
      if (!email || !password) return badRequest('Email and password required');

      const result = await dynamo.send(
        new GetCommand({ TableName: TABLE, Key: { PK: `USER#${email}`, SK: '#META' } })
      );
      const user = result.Item;
      if (!user) return unauthorized();

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return unauthorized();

      // Deactivated accounts cannot log in even with a correct password.
      if (user.active === false) {
        return forbidden('Esta cuenta está desactivada. Contacta al administrador.');
      }

      const token = signToken({
        userId: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
      });

      return ok({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    }

    // ---------------------------------------------------------------
    // POST /auth/register  (owner-only; open only when zero users exist)
    // ---------------------------------------------------------------
    if (method === 'POST' && path.endsWith('/register')) {
      const caller = callerFrom(event);
      const isBootstrap = (await countUsers()) === 0;

      if (!isBootstrap) {
        if (!caller) return unauthorized();
        if (caller.role !== 'owner') {
          return forbidden('Solo el administrador puede crear usuarios');
        }
      }

      const body = JSON.parse(event.body ?? '{}');
      const { name, email, password, role } = body;
      if (!name || !email || !password || !role) return badRequest('Faltan campos requeridos');
      if (!VALID_ROLES.includes(role)) return badRequest('Rol inválido');
      if (String(password).length < MIN_PASSWORD_LENGTH) {
        return badRequest(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();

      try {
        await dynamo.send(
          new PutCommand({
            TableName: TABLE,
            ConditionExpression: 'attribute_not_exists(PK)',
            Item: {
              PK: `USER#${email}`,
              SK: '#META',
              GSI1PK: 'USER',
              GSI1SK: email,
              id,
              name,
              email,
              role,
              passwordHash,
              active: true,
              createdAt: new Date().toISOString(),
              createdBy: caller?.email ?? 'bootstrap',
            },
          })
        );
      } catch (e: unknown) {
        if ((e as { name?: string }).name === 'ConditionalCheckFailedException') {
          return badRequest('Ya existe un usuario con ese correo');
        }
        throw e;
      }

      return ok({ id, name, email, role, active: true });
    }

    // ---------------------------------------------------------------
    // GET /auth/users  (owner-only) — never returns password hashes
    // ---------------------------------------------------------------
    if (method === 'GET' && path.endsWith('/users')) {
      const caller = callerFrom(event);
      if (!caller) return unauthorized();
      if (caller.role !== 'owner') return forbidden('Solo el administrador puede ver los usuarios');

      const res = await dynamo.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :t',
          ExpressionAttributeValues: { ':t': 'USER' },
        })
      );

      const users = (res.Items ?? [])
        .map(publicUser)
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));

      return ok(users);
    }

    // ---------------------------------------------------------------
    // POST /auth/users/{email}/reset-password  (owner-only)
    // The admin SETS a new password; they never see the previous one.
    // Stored hashes are one-way and cannot be reversed by design.
    // ---------------------------------------------------------------
    if (method === 'POST' && path.includes('/users/') && path.endsWith('/reset-password')) {
      const caller = callerFrom(event);
      if (!caller) return unauthorized();
      if (caller.role !== 'owner') {
        return forbidden('Solo el administrador puede restablecer contraseñas');
      }

      const email = emailFromPath(path);
      if (!email) return badRequest('Falta el correo del usuario');

      const body = JSON.parse(event.body ?? '{}');
      const { password } = body;
      if (!password) return badRequest('Falta la nueva contraseña');
      if (String(password).length < MIN_PASSWORD_LENGTH) {
        return badRequest(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
      }

      const existing = await dynamo.send(
        new GetCommand({ TableName: TABLE, Key: { PK: `USER#${email}`, SK: '#META' } })
      );
      if (!existing.Item) return notFound('Usuario no encontrado');

      const passwordHash = await bcrypt.hash(password, 10);

      await dynamo.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `USER#${email}`, SK: '#META' },
          UpdateExpression:
            'SET passwordHash = :h, lastPasswordResetAt = :at, lastPasswordResetBy = :by',
          ExpressionAttributeValues: {
            ':h': passwordHash,
            ':at': new Date().toISOString(),
            ':by': caller.email,
          },
        })
      );

      return ok({ email, message: 'Contraseña restablecida' });
    }

    // ---------------------------------------------------------------
    // PUT /auth/users/{email}  (owner-only) — change role / active flag
    // ---------------------------------------------------------------
    if (method === 'PUT' && path.includes('/users/')) {
      const caller = callerFrom(event);
      if (!caller) return unauthorized();
      if (caller.role !== 'owner') return forbidden('Solo el administrador puede editar usuarios');

      const email = emailFromPath(path);
      if (!email) return badRequest('Falta el correo del usuario');

      const body = JSON.parse(event.body ?? '{}');
      const { role, active } = body;
      if (role !== undefined && !VALID_ROLES.includes(role)) return badRequest('Rol inválido');

      // Guard rail: an owner cannot lock themselves out.
      if (email === caller.email) {
        if (active === false) return badRequest('No puedes desactivar tu propia cuenta');
        if (role !== undefined && role !== 'owner') {
          return badRequest('No puedes cambiar tu propio rol de administrador');
        }
      }

      const existing = await dynamo.send(
        new GetCommand({ TableName: TABLE, Key: { PK: `USER#${email}`, SK: '#META' } })
      );
      if (!existing.Item) return notFound('Usuario no encontrado');

      // Guard rail: never remove the last active owner.
      const isDemotingOwner =
        existing.Item.role === 'owner' &&
        ((role !== undefined && role !== 'owner') || active === false);
      if (isDemotingOwner) {
        const all = await dynamo.send(
          new QueryCommand({
            TableName: TABLE,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :t',
            ExpressionAttributeValues: { ':t': 'USER' },
          })
        );
        const activeOwners = (all.Items ?? []).filter(
          (u) => u.role === 'owner' && u.active !== false
        );
        if (activeOwners.length <= 1) {
          return badRequest('Debe existir al menos un administrador activo');
        }
      }

      const sets: string[] = [];
      const names: Record<string, string> = {};
      const values: Record<string, unknown> = {};

      if (role !== undefined) {
        sets.push('#role = :role');
        names['#role'] = 'role';
        values[':role'] = role;
      }
      if (active !== undefined) {
        sets.push('#active = :active');
        names['#active'] = 'active';
        values[':active'] = Boolean(active);
      }
      if (sets.length === 0) return badRequest('Nada que actualizar');

      sets.push('#updatedAt = :updatedAt', '#updatedBy = :updatedBy');
      names['#updatedAt'] = 'updatedAt';
      names['#updatedBy'] = 'updatedBy';
      values[':updatedAt'] = new Date().toISOString();
      values[':updatedBy'] = caller.email;

      const updated = await dynamo.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `USER#${email}`, SK: '#META' },
          UpdateExpression: `SET ${sets.join(', ')}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        })
      );

      return ok(publicUser(updated.Attributes ?? {}));
    }

    return badRequest('Unknown route');
  } catch (err) {
    return serverError(err);
  }
}
