# Despliegue — ANMA Supervisión de Obras

**Regla única: el despliegue se hace con `git push`. No se despliega a mano.**

```bash
git add -A
git commit -m "descripcion del cambio"
git push
```

Eso es todo. Frontend y backend se publican solos.

---

## Qué pasa cuando haces push

```
git push  →  rama main
                │
                ├─ ¿cambió frontend/**?  →  Vercel construye y publica la SPA
                │                            (~1-2 min)
                │
                └─ ¿cambió backend/**?   →  GitHub Actions:
                                             npm ci → tsc --noEmit → sam build
                                             → sam deploy  (~3-5 min)
```

Los dos son independientes y se disparan por separado. Si un commit solo toca
`frontend/`, el backend no se redespliega — y al revés.

---

## Frontend (Vercel)

| | |
|---|---|
| Disparador | push a `main` que toque `frontend/**` |
| Proceso | Integración de Vercel con GitHub (no hay workflow en el repo) |
| URL | https://frontend-beta-two-86.vercel.app |
| Variables | `VITE_API_URL` se configura en el panel de Vercel, no en el código |
| Rollback | Panel de Vercel → Deployments → "Promote to Production" en un build anterior |

---

## Backend (GitHub Actions → AWS SAM)

| | |
|---|---|
| Disparador | push a `main` que toque `backend/**` o el propio workflow |
| Workflow | `.github/workflows/deploy-backend.yml` |
| Stack | `anma-follow` en `us-east-1` |
| Ver progreso | https://github.com/luisloustaunau/follow/actions |

### Pasos que ejecuta

1. `npm ci` — instala dependencias exactas del `package-lock.json`
2. `npx tsc --noEmit` — **si hay error de tipos, el deploy se detiene aquí**
3. `sam build`
4. `sam deploy --stack-name anma-follow --region us-east-1 ...`

El typecheck antes del deploy es a propósito: es preferible que falle en CI a
que suba una Lambda rota a producción.

### Autenticación: OIDC, sin llaves

GitHub pide un token temporal a AWS en cada ejecución y asume el rol
`anma-github-deploy`. **No hay llaves de acceso guardadas en el repo.**

La política de confianza del rol solo acepta:

```
repo:luisloustaunau/follow:ref:refs/heads/main
```

Es decir: ni un fork, ni un pull request, ni otra rama pueden desplegar.

Requiere un único secret en GitHub → Settings → Secrets → Actions:

| Secret | Valor |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::439326782883:role/anma-github-deploy` |

### Por qué el workflow pasa `--stack-name` explícito

`backend/samconfig.toml` está en `.gitignore`, así que el runner nunca lo
recibe. Los valores van escritos en el workflow. Se prefirió esto sobre
publicar el `samconfig.toml`, porque ese archivo puede acumular parámetros
locales que CI no debería heredar.

### Por qué NO se pasa `--parameter-overrides`

Una actualización de stack reutiliza automáticamente los parámetros ya
guardados (`JwtSecret`, `AllowedOrigin`). Así **el secreto nunca pasa por CI
ni queda en los logs de GitHub**.

Solo se pasa a mano si se quiere **rotar** el secreto:

```bash
openssl rand -base64 48
cd backend && sam deploy --parameter-overrides JwtSecret=<nuevo>
```

⚠️ Rotar invalida todas las sesiones activas: todos tienen que volver a entrar.

---

## Redesplegar sin cambiar código

GitHub → pestaña **Actions** → **Deploy backend** → **Run workflow**.

Útil para reintentar un deploy que falló por una causa externa.

---

## Si algo falla

| Síntoma en Actions | Causa probable |
|---|---|
| `Error: Could not assume role` | Falta el secret `AWS_DEPLOY_ROLE_ARN` o está mal escrito |
| `Missing option '--stack-name'` | Se quitaron los flags explícitos del paso de deploy |
| Falla en `Typecheck` | Error de TypeScript real — arreglar y volver a pushear |
| `No changes to deploy` | Normal. `--no-fail-on-empty-changeset` lo trata como éxito |

---

## Comandos que siguen siendo manuales

El despliegue ya no lo es, pero estos sí:

```bash
# Datos de prueba
cd backend && npm run seed

# Restablecer contraseña de un usuario
cd backend && node scripts/reset-password.mjs correo@anma.mx 'NuevaContraseña!'

# Desarrollo local del frontend
cd frontend && npm run dev

# Verificar tipos sin desplegar
cd backend && npm run typecheck
```

---

## Deuda técnica conocida

El rol `anma-github-deploy` tiene `PowerUserAccess` + `IAMFullAccess`. Es más
amplio de lo necesario: cualquiera con permiso de push a `main` puede tocar casi
toda la cuenta de AWS. Se hizo así para no pelear con permisos durante el
arranque. Conviene cerrarlo a una política mínima (CloudFormation, Lambda, S3,
DynamoDB, API Gateway y el `iam:PassRole` de los roles del stack).
