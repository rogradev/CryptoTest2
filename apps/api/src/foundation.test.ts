import { describe, it, expect, vi } from "vitest";
import { Keypair } from "@solana/web3.js";
import {
  lamportsToSol,
  solToLamports,
} from "../../../packages/shared/src/index.js";
import { envSchema } from "./config.js";
import { encryptSecret, decryptSecret } from "./encryption.js";
import { isSolanaAddress, SolanaDevnetProvider } from "./blockchain.js";
import {
  WalletService,
  type StoredWallet,
  type WalletRepository,
} from "./wallet.js";
const key = "ab".repeat(32);
describe("integer accounting", () => {
  it("round trips single lamports and values above JS safe integer", () => {
    for (const n of [0n, 1n, 1000000000n, 9007199254740993n])
      expect(solToLamports(lamportsToSol(n))).toBe(n);
  });
  it("formats negative ledger amounts without rounding", () =>
    expect(lamportsToSol(-1n)).toBe("-0.000000001"));
  it("rejects fractional lamports, negatives, exponent notation and floating inputs", () => {
    for (const n of ["1.0000000001", "-1", "1e9", "NaN", "1."])
      expect(() => solToLamports(n)).toThrow();
  });
});
describe("configuration", () => {
  const base = {
    DATABASE_URL: "postgresql://localhost/wallet",
    WALLET_ENCRYPTION_KEY: key,
  };
  it("accepts Vercel production runtime while retaining Devnet", () => {
    const config = envSchema.parse({ ...base, NODE_ENV: "production" });
    expect(config.SOLANA_CLUSTER).toBe("devnet");
  });
  it("accepts devnet defaults", () =>
    expect(envSchema.parse(base).SOLANA_CLUSTER).toBe("devnet"));
  it("rejects mainnet, missing key and malformed key", () => {
    for (const c of [
      { ...base, SOLANA_CLUSTER: "mainnet-beta" },
      { DATABASE_URL: base.DATABASE_URL },
      { ...base, WALLET_ENCRYPTION_KEY: "secret" },
    ])
      expect(envSchema.safeParse(c).success).toBe(false);
  });
  it("rejects known mainnet endpoints", () =>
    expect(
      envSchema.safeParse({
        ...base,
        SOLANA_RPC_URL: "https://api.mainnet-beta.solana.com",
      }).success,
    ).toBe(false));
  it("requires verified HTTPS transport", () =>
    expect(
      envSchema.safeParse({
        ...base,
        SOLANA_RPC_URL: "http://api.devnet.solana.com",
      }).success,
    ).toBe(false));
});
describe("custody encryption", () => {
  it("authenticates encrypted material and uses fresh IVs", () => {
    const secret = Keypair.generate().secretKey;
    const a = encryptSecret(secret, key);
    expect(decryptSecret(a, key)).toEqual(Buffer.from(secret));
    expect(encryptSecret(secret, key)).not.toBe(a);
    expect(() => decryptSecret(a, "cd".repeat(32))).toThrow();
    const parts = a.split(":");
    parts[3] = Buffer.alloc(64).toString("base64");
    expect(() => decryptSecret(parts.join(":"), key)).toThrow();
  });
});
describe("addresses", () => {
  it("rejects malformed addresses", () => {
    expect(isSolanaAddress("invalid")).toBe(false);
    expect(isSolanaAddress("0".repeat(44))).toBe(false);
    expect(isSolanaAddress(Keypair.generate().publicKey.toBase58())).toBe(true);
  });
});
describe("wallet application service", () => {
  function fixture() {
    let stored: StoredWallet | null = null;
    let ciphertext = "";
    const repository: WalletRepository = {
      find: vi.fn(async () => stored),
      create: vi.fn(async (userId, address, encrypted) => {
        ciphertext = encrypted;
        stored = {
          id: "wallet-1",
          user_id: userId,
          address,
          created_at: new Date("2026-01-01"),
        };
        return stored;
      }),
    };
    const generated = Keypair.generate();
    const provider = {
      createWallet: vi.fn(async () => ({
        address: generated.publicKey.toBase58(),
        secret: generated.secretKey.slice(),
      })),
      getBalance: vi.fn(async () => 1234567891n),
      getRecentTransactions: vi.fn(async () => []),
    };
    return { repository, provider, ciphertext: () => ciphertext };
  }
  it("retrieves a persisted wallet across fresh service instances without regenerating", async () => {
    const f = fixture();
    const a = await new WalletService(f.repository, f.provider, key).getWallet(
      "user-abc",
    );
    const b = await new WalletService(f.repository, f.provider, key).getWallet(
      "user-abc",
    );
    expect(a).toEqual(b);
    expect(f.provider.createWallet).toHaveBeenCalledTimes(1);
    expect(f.repository.create).toHaveBeenCalledWith(
      "user-abc",
      a.address,
      expect.stringMatching(/^v1:/),
    );
    expect(a).not.toHaveProperty("encrypted_secret");
    expect(decryptSecret(f.ciphertext(), key)).toHaveLength(64);
  });
  it("reads the actual provider balance with exact formatting", async () => {
    const f = fixture();
    const b = await new WalletService(
      f.repository,
      f.provider,
      key,
    ).getOnChainBalance("user-abc");
    expect(b.balanceLamports).toBe("1234567891");
    expect(b.balanceSol).toBe("1.234567891");
    expect(b.source).toBe("on-chain");
    expect(f.provider.getBalance).toHaveBeenCalledWith(b.address);
  });
  it("does not fabricate successful balances on RPC failure", async () => {
    const f = fixture();
    f.provider.getBalance.mockRejectedValueOnce(new Error("RPC down"));
    await expect(
      new WalletService(f.repository, f.provider, key).getOnChainBalance(
        "user-abc",
      ),
    ).rejects.toThrow("RPC down");
  });
});
describe("Devnet guard", () => {
  it("rejects other network genesis before reading balance", async () => {
    const p = new SolanaDevnetProvider("https://api.devnet.solana.com");
    const connection = (
      p as unknown as {
        connection: {
          getGenesisHash: () => Promise<string>;
          getBalance: () => Promise<number>;
        };
      }
    ).connection;
    vi.spyOn(connection, "getGenesisHash").mockResolvedValue("mainnet");
    const read = vi.spyOn(connection, "getBalance");
    await expect(
      p.getBalance(Keypair.generate().publicKey.toBase58()),
    ).rejects.toThrow("not Solana Devnet");
    expect(read).not.toHaveBeenCalled();
  });
});
