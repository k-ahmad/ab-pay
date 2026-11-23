# AB PAY - Phase 1 (backend) - kya badla aur kaise lagana hai

## Files (apne `app/` folder mein isi jagah replace karein)

| File | Kya hua |
|------|---------|
| `app/__init__.py` | Default / kamzor secret ho to server start hi nahi hota |
| `app/config.py` | Naye settings (neeche dekhein) |
| `app/models/__init__.py` | `Deposit` model bhi register hua |
| `app/models/deposit.py` | Naya column `idempotency_key` |
| `app/models/user.py` | Naye columns `failed_login_attempts`, `locked_until` |
| `app/routes/auth.py` | Phone 01XXXXXXXXX mein save, name, login par lock, `/me` mein name |
| `app/routes/deposits.py` | Idempotency save, audit logs, ledger helper, global reference check |
| `app/routes/admin.py` | Test credit band, admin apni withdrawal review nahi kar sakta |
| `app/routes/withdrawals.py` | Sirf verified payout number par withdrawal, user ki apni lists |
| `app/routes/payout_numbers.py` | Number normalise, provider check, admin apna number verify nahi kar sakta |
| `app/services/validators.py` | **Nai file** (phone ka helper) |

## Server / .env mein ye settings

```
SECRET_KEY=<random 32+ characters>
JWT_SECRET_KEY=<random 32+ characters>
```

Random value banane ke liye:

```
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Apne computer par (local development) `.env` mein ye bhi rakhein:

```
APP_ENV=development
```

Optional:

```
ALLOW_TEST_CREDIT=true              # sirf APP_ENV=development ke saath kaam karta hai
REQUIRE_VERIFIED_PAYOUT_NUMBER=false # sirf local testing ke liye, default true
LOGIN_MAX_ATTEMPTS=5                # default 5
LOGIN_LOCK_SECONDS=900              # default 900 (15 minute)
```

## Database migration (3 naye columns)

```
flask db migrate -m "phase1 deposit idempotency and login lock"
flask db upgrade
```

Migration file ko ek baar kholkar dekh lein: usmein sirf `deposits.idempotency_key`,
`users.failed_login_attempts` aur `users.locked_until` add hone chahiyen.

## Naye API

- `GET /api/wallet/withdrawals` - user ki apni withdrawals (`?limit=50&offset=0`)
- `GET /api/wallet/transactions` - user ki apni transactions (`?type=&status=&limit=&offset=`)
