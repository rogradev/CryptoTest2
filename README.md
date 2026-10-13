# Orbit · Solana Devnet wallet checkpoint

A standalone PERN development checkpoint for a native SOL wallet. The React dashboard is backed by Express, PostgreSQL and live Solana Devnet RPC. Funds and balances are test funds only. This is a prototype custodial wallet, not production custody.

## Current implemented checkpoint

✓ PERN application  
✓ PostgreSQL persistence  
✓ demo-user abstraction  
✓ real Solana Devnet wallet  
✓ encrypted Devnet wallet secret  
✓ wallet dashboard  
✓ Add Funds interface  
✓ real address  
✓ QR code  
✓ real on-chain Devnet balance  
✓ balance refresh

## Architecture

```text
React / Vite → Express / TypeScript → WalletService(userId)
                                      ├─ WalletRepository → PostgreSQL
                                      └─ BlockchainProvider → SolanaDevnetProvider → Devnet RPC
```

`DemoUserMiddleware` supplies `request.user.id = "demo-user-001"`. Replace it with the client's JWT/session middleware when integrating; controllers and application services already use a generic `userId: string`. Adapt `WalletRepository` and the migration's user foreign keys to the client's user table as needed. There is no client authentication yet. The demo API must not be exposed as a production service.

The provider owns key generation, confirmed balance reads and recent signatures; controllers never call web3.js. Every on-chain read verifies the RPC's genesis hash against Devnet. A wrong network fails closed. No transaction signing/broadcasting or mainnet functionality exists.

`getOnChainBalance` is a blockchain observation, **not** an internal ledger balance. Lamports are represented as `bigint` in services, decimal strings in JSON and `numeric(20,0)` in SQL. SOL formatting uses integer division; user SOL input is parsed from strings. web3.js returns numbers for balance; unsafe values are rejected before conversion to bigint.

## Directory structure

```text
apps/
  api/src/        config, middleware/controllers, wallet service/repository,
                  encryption, Devnet provider, migrations runner, unit tests
  web/src/        responsive React dashboard, deposit and withdrawal dialogs
packages/shared/src/  API types and exact lamport formatting
database/migrations/001_foundation.sql
scripts/          local env initialization, database integration and browser checks
docker-compose.yml
.env.example
package.json
tsconfig.json
```

## Run locally

Requirements: Node.js 22 or newer, npm, Docker with Compose. Run from the repository root:

```sh
npm ci
node scripts/init-env.mjs
docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run dev
```

Open the Vite application at `http://localhost:5173` on your local machine. API: port 3001; PostgreSQL: localhost 5432. Vite proxies `/api` to the backend. Root `dev` starts both servers. For a cloud instance, use its supported application access mechanism; loopback addresses are not public previews.

`init-env.mjs` creates an ignored `.env` once, with a random 32-byte encryption key and local-only development defaults. It never overwrites an existing file or prints the key. You can instead copy `.env.example` and configure it manually. Keep the encryption key together with a secure database backup. **Never rotate or regenerate it after wallet creation without a key migration.** Deleting the database volume deletes the wallet. Normal restarts preserve it.

| Variable                | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `NODE_ENV`              | `development` or `test`; production mode intentionally unsupported |
| `DATABASE_URL`          | PostgreSQL connection URL                                          |
| `PORT`                  | API port, defaults to 3001                                         |
| `WEB_ORIGIN`            | Exact CORS origin, defaults to localhost:5173                      |
| `SOLANA_RPC_URL`        | HTTPS Devnet RPC, defaults to `https://api.devnet.solana.com`      |
| `SOLANA_CLUSTER`        | Must be `devnet`                                                   |
| `WALLET_ENCRYPTION_KEY` | 64 hexadecimal characters, AES-256 key, never committed            |

Migrations use a transaction and advisory lock; repeated runs skip applied SQL. Seed is idempotent. The demo user must exist before the wallet endpoint is called. The first wallet request generates a real Solana keypair server-side and encrypts its secret bytes using AES-256-GCM with a fresh nonce. A database uniqueness constraint ensures one wallet per user/network, even with concurrent initial requests. The public address is returned; encrypted material remains in PostgreSQL. Later requests reuse the same wallet.

## Database foundation

| Table                     | Purpose                                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| `users`                   | Temporary demo user identity                                           |
| `wallet_accounts`         | User/network/address, authenticated encrypted secret, creation date    |
| `deposits`                | Future deposit signature, integer amount, detection/confirmation state |
| `withdrawals`             | Future destination, integer amount, signature and lifecycle            |
| `ledger_entries`          | Future credits/debits, integer amount and reference                    |
| `blockchain_transactions` | Future direction, amount, slot, signature and status                   |
| `schema_migrations`       | Applied SQL migrations                                                 |

Foreign keys and composite user/wallet constraints prevent cross-user association. Amounts are positive integer lamports, statuses constrained, signatures/references uniquely indexed for idempotency. These are foundations only: no deposit worker, ledger posting or withdrawal engine writes these tables yet. Recent activity comes directly from RPC signatures; it does not invent deposit/withdrawal amounts or directions.

## API

Responses are plain JSON; errors use `{ "error": { "code", "message", "issues"? } }` and never contain stack traces or secret values.

| Endpoint                                | Behavior                                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                       | Database readiness, demo flag, network; does not certify RPC connectivity                                                     |
| `GET /api/wallet`                       | Create/retrieve the persisted public wallet for request user                                                                  |
| `GET /api/wallet/balance`               | Real confirmed on-chain lamports, SOL string, observation time                                                                |
| `GET /api/wallet/deposit-address`       | Same persisted public deposit address                                                                                         |
| `GET /api/wallet/transactions`          | Up to 10 actual recent signatures, slot, status, block time                                                                   |
| `POST /api/wallet/withdrawals/validate` | Validate `{destination, amount}` with Zod, base58 public key and exact decimals; compare to on-chain balance; never broadcast |

Withdrawal validation excludes network fees and is not authorization to spend. The frontend's final withdrawal button is disabled explicitly.

## Client demonstration (60–90 seconds)

1. Open Overview; show the demo user and prominent **SOLANA DEVNET** badge.
2. Show the real on-chain balance and refresh timestamp. A network failure shows an error, never a fabricated zero.
3. Click **Add Funds**. Show native SOL, Devnet, the full persisted address and its address-only QR.
4. Click **Copy Address** and show confirmation. Clipboard needs a secure browser context (localhost is supported).
5. Fund this address from another Devnet wallet or a Solana Devnet faucet. Select Devnet explicitly; never send real funds. Faucet availability/rate limits are external.
6. Wait for confirmation, click Refresh, and show the changed confirmed blockchain balance. The displayed amount is always from RPC, not simulated activity.
7. Close the dialog and show actual signature activity with Devnet Explorer links.
8. Open Withdraw and show the destination/amount form and disabled **Coming next** action.
9. Briefly show the database/service boundaries for the next milestone.

To verify persistence, record `GET /api/wallet`, stop/restart the API and request it again. The address must match. `docker compose stop` and `docker compose up -d --wait` preserve the named volume. Do not run `down -v` unless intentionally discarding the wallet.

## Validation

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:integration
npm run test:browser
```

Unit tests mock Solana and do not depend on Devnet. Database integration tests use a disposable schema in the configured PostgreSQL, exercising clean migrations, repeated seed/migration, concurrency, new-service retrieval and authenticated key integrity. Browser checks require the API/web servers running. Install Chromium once with `npx playwright install chromium` (or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing Chromium).

Build output lives under each app's `dist/`. `npm start -w apps/api` runs the compiled API; the root `.env` and database migrations remain alongside the project. Vite's static output is in `apps/web/dist`; deploying it requires routing `/api` to the Express server and an appropriate CORS origin. Development Vite proxying is already configured.

## Security limitations

Devnet prototype only. No production custody, authentication, authorization, withdrawal signing, rate limiting or key management service. All demo requests share a fixed user. CORS is restricted to the configured web origin; Helmet and bounded JSON parsing are enabled. SQL is parameterized. Private keys are never returned, logged or committed. AES-GCM detects ciphertext tampering; the master key resides only in ignored local configuration or injected environment. Database credentials in Compose are **local development defaults**. Do not reuse them in deployment. Never expose the database or this demo API publicly. External RPC outages and faucet limits can prevent a live demonstration; UI errors identify unavailable data.

## Next milestone

→ automatic deposit detection  
→ internal ledger  
→ deposit confirmation states  
→ complete withdrawal broadcasting  
→ unified transaction history

Client authentication integration, production custody and other networks/assets are outside this checkpoint. Continue this repository by adding application services behind the same user/provider/repository boundaries.

## Validation record for this checkpoint

The prepared cloud instance ran frozen-lockfile installation, PostgreSQL startup, migrations and demo seed, strict TypeScript, ESLint, production builds and 13 unit tests successfully. The disposable-schema PostgreSQL integration check passed. All three Chromium browser checks passed: live dashboard/deposit, decoded QR matching the address, clipboard, refresh, disabled withdrawal, mobile sizing and honest RPC failure states. The compiled API also started successfully and all documented endpoints were exercised. The persisted demo address remained unchanged across API restarts.

**Live funding acceptance check passed:** after external Devnet funding, the persisted wallet changed from 0 to **5.000000000 SOL** (5,000,000,000 lamports). The API retrieved the confirmed on-chain balance and a confirmed signature at slot 510457650. All three browser checks passed again with the funded wallet, verifying that the dashboard and deposit dialog display the live balance and refresh correctly. Signature: `WJGH3rTCE6gsPMKUJeTJUzEvbTjXLqq6ne6ysKNFUuSr8jU5SY67Vw46Qg5CAUUhX6U5wezmY28hJWjoUSVAJU3`. No simulated balance was substituted.

`npm audit --omit=dev` reported four moderate transitive findings in the web3.js dependency chain (stream-json/uuid and dependent packages), with no high or critical findings. The compatible web3.js chain has no complete upstream fix advertised by npm; review/update these dependencies before extending this prototype toward production. No verification or integrity checks were disabled.

Reusable installation and startup instructions, plus `api.devnet.solana.com` network access, were saved to the cloud environment draft. Review/save them in environment settings and publish through the product. Publication and restoration in a fresh task have not been verified.
