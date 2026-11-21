# AB PAY Flask Backend — Starter

This is the first backend foundation for the AB PAY React app. It includes a Flask application factory, database configuration, initial data models, and a health endpoint. It does **not** process real payments or approve financial requests.

## 1. Requirements
- Python 3.10+
- Your existing React/Vite frontend

## 2. Setup (Mac)
Open Terminal in this `ab_pay_backend` folder:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Before any public deployment, replace `SECRET_KEY` in `.env` with a long random secret. Never commit `.env` to Git.

## 3. Create the database tables

```bash
flask --app run.py db init
flask --app run.py db migrate -m "initial database schema"
flask --app run.py db upgrade
```

If the `migrations` directory has already been created, do not run `db init` again; use `migrate` and `upgrade` only.

## 4. Start the API

```bash
python run.py
```

Check in your browser: `http://127.0.0.1:5000/api/health`

Expected response:

```json
{"status":"ok","database":"connected","service":"AB PAY API"}
```

## 5. Frontend connection
The Vite frontend runs on `http://localhost:5173` by default. The backend CORS setting allows that origin. Later, React API calls will use `http://127.0.0.1:5000/api/...`.

## Included database models
- `User`: phone, password hash, referral code, referrer, role and status
- `Wallet`: BDT available, pending and reserved balances
- `Transaction`: deposit/withdrawal/reward requests and statuses
- `LedgerEntry`: auditable balance movements

Money fields use `Numeric(18, 2)` rather than floating-point values.

## Important safety boundary
- No real bKash/Nagad/Rocket/Upay payment integration is included.
- No wallet balance is credited or deducted by this starter.
- No admin approval endpoint exists yet.
- Live payments require approved merchant/provider access, official API/webhook verification, reconciliation and security review.
- Do not use this starter for real customer funds until the remaining controls and tests are implemented.
