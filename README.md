# ANMA — Supervisión de Obras

Web platform for ANMA Ingeniería to manage weekly field reports and monthly billing estimations across multiple construction fronts.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind |
| Backend | AWS Lambda (Node 20) + API Gateway |
| Database | AWS DynamoDB (single-table) |
| Storage | AWS S3 (photos) |
| Auth | JWT (bcrypt passwords stored in DynamoDB) |
| Deploy (FE) | Vercel |
| Deploy (BE) | AWS SAM |

---

## Local development

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Backend (requires AWS SAM CLI)
```bash
cd backend
npm install
npm run build
sam local start-api --port 3001
```

---

## Deploy

### Backend to AWS
```bash
cd backend
npm run build
sam build
sam deploy --guided
```
Copy the ApiUrl output and set it in frontend/.env.production as VITE_API_URL.

### Frontend to Vercel
```bash
cd frontend
npx vercel --prod
```
Set env var VITE_API_URL in the Vercel dashboard.

---

## Roles

| Role | Permissions |
|---|---|
| owner | Read everything, create projects/fronts |
| supervisor | Submit weekly reports for their fronts |
| billing | Update estimation status, invoice numbers, paid dates |

---

## Modules

1. Reportes semanales — Weekly progress per front with chart, photos, description
2. Estimaciones — Monthly billing: POR_INGRESAR → INGRESADA → EN_REVISION → APROBADA → PAGADA
