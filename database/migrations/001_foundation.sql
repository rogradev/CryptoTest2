CREATE TABLE users (id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE wallet_accounts (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
 network text NOT NULL CHECK(network='solana-devnet'), address text NOT NULL UNIQUE,
 encrypted_secret text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,network), UNIQUE(id,user_id)
);
CREATE TABLE deposits (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), wallet_account_id uuid NOT NULL,
 signature text NOT NULL UNIQUE, amount_lamports numeric(20,0) NOT NULL CHECK(amount_lamports>0),
 status text NOT NULL CHECK(status IN ('detected','confirmed','failed')),
 detected_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(wallet_account_id,user_id) REFERENCES wallet_accounts(id,user_id)
);
CREATE TABLE withdrawals (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), wallet_account_id uuid NOT NULL,
 destination_address text NOT NULL, amount_lamports numeric(20,0) NOT NULL CHECK(amount_lamports>0),
 signature text UNIQUE, status text NOT NULL CHECK(status IN ('requested','pending','completed','failed')),
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 FOREIGN KEY(wallet_account_id,user_id) REFERENCES wallet_accounts(id,user_id)
);
CREATE TABLE ledger_entries (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
 type text NOT NULL CHECK(type IN ('credit','debit')), amount_lamports numeric(20,0) NOT NULL CHECK(amount_lamports>0),
 reference_type text NOT NULL CHECK(reference_type IN ('deposit','withdrawal')), reference_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(reference_type,reference_id,type)
);
CREATE TABLE blockchain_transactions (
 id uuid PRIMARY KEY, wallet_account_id uuid NOT NULL REFERENCES wallet_accounts(id), signature text NOT NULL,
 direction text NOT NULL CHECK(direction IN ('in','out')), amount_lamports numeric(20,0) NOT NULL CHECK(amount_lamports>0),
 slot numeric(20,0) NOT NULL, status text NOT NULL CHECK(status IN ('pending','confirmed','failed')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(wallet_account_id,signature,direction)
);
CREATE INDEX deposits_user_created ON deposits(user_id,created_at DESC);
CREATE INDEX withdrawals_user_created ON withdrawals(user_id,created_at DESC);
CREATE INDEX ledger_user_created ON ledger_entries(user_id,created_at DESC);
