import React from "react";
import { createRoot } from "react-dom/client";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  X,
  Wallet,
  LayoutGrid,
  Activity,
  ShieldCheck,
  ExternalLink,
  Globe,
  ChevronDown,
} from "lucide-react";
import type {
  WalletView,
  BalanceView,
  TransactionView,
} from "../../../packages/shared/src/index";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "./styles.css";
async function api<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error?.message ?? "Unable to reach the wallet API");
  }
  return res.json() as Promise<T>;
}
function App() {
  const [wallet, setWallet] = React.useState<WalletView>();
  const [balance, setBalance] = React.useState<BalanceView>();
  const [transactions, setTransactions] = React.useState<TransactionView[]>([]);
  const [txError, setTxError] = React.useState("");
  const [txBusy, setTxBusy] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [modal, setModal] = React.useState<"deposit" | "withdraw" | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [amount, setAmount] = React.useState("");
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setBalance(await api<BalanceView>("/wallet/balance"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function history() {
    setTxBusy(true);
    try {
      setTransactions(
        (await api<{ transactions: TransactionView[] }>("/wallet/transactions"))
          .transactions,
      );
      setTxError("");
    } catch (e) {
      setTxError((e as Error).message);
    } finally {
      setTxBusy(false);
    }
  }
  React.useEffect(() => {
    void api<WalletView>("/wallet")
      .then(setWallet)
      .catch((e) => setError(e.message));
    void refresh();
    void history();
  }, []);
  React.useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".modal button:not(:disabled), .modal input, .modal a[href]",
          ),
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      document.body.style.overflow = before;
      previous?.focus();
    };
  }, [modal]);
  async function copy() {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setCopyError("");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError("Copy unavailable. Select and copy the address below.");
    }
  }
  const shownBalance = balance?.balanceSol;
  const short = wallet
    ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-6)}`
    : "Creating wallet…";
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Orbit home">
          <span className="brand-icon">◉</span> orbit
          <span className="brand-dot">.</span>
        </a>
        <span className="mobile-demo">
          Demo user <small>demo-user-001</small>
        </span>
        <div className="workspace">
          <span className="avatar small">D</span>
          <div>
            Demo workspace<small>Development account</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          <a className="active" href="#overview">
            <LayoutGrid size={19} />
            Overview
            <span className="nav-dot" />
          </a>
          <a href="#activity">
            <Activity size={19} />
            Activity
          </a>
          <button onClick={() => setModal("deposit")}>
            <Wallet size={19} />
            Wallet address
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="testnet-note">
            <ShieldCheck size={21} />
            <strong>A safe space to explore</strong>
            <p>
              This wallet uses Devnet SOL.
              <br />
              Test funds have no real value.
            </p>
            <span>DEVELOPMENT CHECKPOINT</span>
          </div>
          <div className="profile">
            <span className="avatar">D</span>
            <div>
              Demo user<small>demo-user-001</small>
            </div>
            <span className="online" />
          </div>
        </div>
      </aside>
      <div className="main">
        <header>
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Overview</strong>
          </div>
          <div className="network">
            <span /> SOLANA DEVNET
          </div>
        </header>
        <main id="overview">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR WALLET, AT A GLANCE</div>
              <h1>A little space for your SOL.</h1>
              <p>Manage your test funds. Explore what’s possible.</p>
            </div>
            <div className="live-label">
              <Globe size={15} /> Solana Devnet
            </div>
          </div>
          <section className="balance-card">
            <div className="balance-content">
              <div className="balance-top">
                <span>On-chain balance</span>
                <span className="asset-pill">
                  <span className="sol-bars">≋</span> SOL
                </span>
              </div>
              <div className="balance-number">
                {shownBalance ? (
                  <>
                    {shownBalance.split(".")[0]}
                    <span>.{shownBalance.split(".")[1]}</span>
                  </>
                ) : (
                  <span className="unknown">
                    {busy ? "Loading…" : "Unavailable"}
                  </span>
                )}{" "}
                {shownBalance && <em>SOL</em>}
              </div>
              <div className="balance-caption">
                <span className="tiny-dot" />{" "}
                {balance
                  ? "Confirmed balance · Solana Devnet"
                  : "Live blockchain balance · Solana Devnet"}
              </div>
              <div className="balance-actions">
                <button
                  className="primary"
                  disabled={!wallet}
                  onClick={() => setModal("deposit")}
                >
                  <ArrowDownLeft size={18} />
                  Add Funds
                </button>
                <button className="light" onClick={() => setModal("withdraw")}>
                  <ArrowUpRight size={18} />
                  Withdraw
                </button>
                <button
                  className="refresh"
                  onClick={() => {
                    void refresh();
                    void history();
                  }}
                  disabled={busy}
                  aria-label="Refresh balance"
                >
                  <RefreshCw size={18} className={busy ? "spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            <div className="orb-art" aria-hidden="true">
              <div className="orbit-ring ring-one" />
              <div className="orbit-ring ring-two" />
              <div className="sphere">
                <span>≋</span>
              </div>
              <span className="star star-one">✦</span>
              <span className="star star-two">✦</span>
            </div>
            <div className="balance-footer">
              <span>
                <ShieldCheck size={15} /> Devnet test funds only
              </span>
              <span>
                {balance
                  ? `Updated ${new Date(balance.observedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Waiting for a live balance"}
              </span>
            </div>
          </section>
          {error && (
            <div className="error" role="alert">
              {error}{" "}
              <button
                onClick={() => {
                  void api<WalletView>("/wallet")
                    .then(setWallet)
                    .catch((e) => setError(e.message));
                  void refresh();
                  void history();
                }}
              >
                Try again
              </button>
            </div>
          )}
          <div className="detail-grid">
            <section className="address-card">
              <div className="section-icon">
                <Wallet size={19} />
              </div>
              <div>
                <h3>Your wallet address</h3>
                <p>One address. Ready for Devnet SOL.</p>
                <button
                  className="address-short"
                  onClick={() => setModal("deposit")}
                  disabled={!wallet}
                >
                  {short}
                  <ArrowRight size={15} />
                </button>
              </div>
              <button
                className="icon-button"
                disabled={!wallet}
                onClick={() => void copy()}
                aria-label="Copy wallet address"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </section>
            <section className="network-card">
              <div className="section-icon mint">
                <Globe size={19} />
              </div>
              <div>
                <h3>Connected to Devnet</h3>
                <p>Native SOL · Test environment</p>
                <span className="network-caption">
                  {balance
                    ? "RPC verified · confirmed commitment"
                    : "Balance verifies the Devnet RPC"}
                </span>
              </div>
              <span className="status-dot" />
            </section>
          </div>
          {copyError && <p role="alert">{copyError}</p>}
          {copied && (
            <span className="toast" role="status">
              Address copied
            </span>
          )}
          <section className="transactions" id="activity">
            <div className="section-heading">
              <div>
                <h2>Recent activity</h2>
                <p>Your wallet’s latest on-chain signatures.</p>
              </div>
              <span className="count">{transactions.length} transactions</span>
            </div>
            {txBusy ? (
              <div className="empty" role="status">
                <RefreshCw className="spin" size={25} />
                <p>Reading on-chain activity…</p>
              </div>
            ) : txError ? (
              <div className="empty">
                <Activity size={30} />
                <h3>Activity is unavailable</h3>
                <p>{txError}</p>
                <button className="text-button" onClick={() => void history()}>
                  Retry activity <ArrowRight size={15} />
                </button>
              </div>
            ) : transactions.length ? (
              <div className="tx-list">
                {transactions.map((t) => (
                  <a
                    key={t.signature}
                    className="tx"
                    href={`https://explorer.solana.com/tx/${t.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="section-icon">
                      <Activity size={18} />
                    </span>
                    <div>
                      <strong>On-chain transaction</strong>
                      <small>
                        {t.signature.slice(0, 12)}…{t.signature.slice(-8)} ·
                        Slot {t.slot}
                      </small>
                    </div>
                    <span
                      className={t.status === "failed" ? "failed" : "confirmed"}
                    >
                      {t.status}
                    </span>
                    <ExternalLink size={15} />
                  </a>
                ))}
              </div>
            ) : (
              <div className="empty">
                <div className="empty-icon">
                  <ArrowDownLeft size={23} />
                  <ArrowUpRight size={23} />
                </div>
                <h3>Your next move starts here</h3>
                <p>
                  Fund your wallet with Devnet SOL to begin.
                  <br />
                  Your on-chain activity will appear here.
                </p>
                <button
                  className="text-button"
                  onClick={() => setModal("deposit")}
                  disabled={!wallet}
                >
                  Add your first test funds <ArrowRight size={15} />
                </button>
              </div>
            )}
          </section>
          <footer>
            <span>
              <ShieldCheck size={14} /> Built for exploration. Devnet only.
            </span>
            <span>
              Wallet checkpoint <span className="footer-dot">·</span> Native SOL
            </span>
          </footer>
        </main>
      </div>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="close icon-button"
              onClick={() => setModal(null)}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
            <div className="modal-icon">
              <ArrowDownLeft size={24} />
            </div>
            <div className="eyebrow">SOLANA DEVNET</div>
            <h2 id="modal-title">
              {modal === "deposit" ? "Add a little SOL." : "Withdraw SOL"}
            </h2>
            <p className="modal-description">
              {modal === "deposit"
                ? "Send Devnet SOL to your personal test wallet."
                : "The next step in your wallet journey."}
            </p>
            {modal === "deposit" ? (
              <>
                <div className="asset-row">
                  <span>
                    Asset <strong>SOL</strong>
                  </span>
                  <span>
                    Network <strong>Solana Devnet</strong>
                  </span>
                </div>
                {wallet ? (
                  <>
                    <div className="qr">
                      <QRCodeSVG
                        value={wallet.address}
                        size={190}
                        level="M"
                        title="Solana Devnet deposit address"
                      />
                    </div>
                    <label className="field-label">YOUR DEPOSIT ADDRESS</label>
                    <div className="full-address">{wallet.address}</div>
                    <button
                      className="primary wide"
                      onClick={() => void copy()}
                    >
                      {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
                      {copied ? "Address copied" : "Copy Address"}
                    </button>
                    {copyError && <p role="alert">{copyError}</p>}
                  </>
                ) : (
                  <p>Wallet unavailable. Close this dialog and retry.</p>
                )}
                <div className="modal-balance">
                  <span>
                    Current on-chain balance
                    <strong>
                      {shownBalance ? `${shownBalance} SOL` : "Unavailable"}
                    </strong>
                  </span>
                  <button
                    className="icon-button"
                    onClick={() => void refresh()}
                    disabled={busy}
                    aria-label="Refresh deposit balance"
                  >
                    <RefreshCw size={19} className={busy ? "spin" : ""} />
                  </button>
                </div>
                {error && (
                  <p className="modal-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="notice">
                  <ShieldCheck size={18} />
                  <span>
                    <strong>DEVNET TEST FUNDS ONLY</strong>Send only native SOL
                    on Solana Devnet. Test funds have no monetary value.
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="notice">
                  <ShieldCheck size={20} />
                  <span>
                    <strong>Next implementation milestone</strong>Withdrawal
                    broadcasting is not enabled. This form will never send
                    funds.
                  </span>
                </div>
                <label className="field-label" htmlFor="destination">
                  DESTINATION ADDRESS
                </label>
                <input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Enter a Solana address"
                />
                <label className="field-label" htmlFor="amount">
                  AMOUNT · SOL
                </label>
                <input
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                />
                <p className="available">
                  On-chain balance:{" "}
                  {shownBalance ? `${shownBalance} SOL` : "Unavailable"}
                </p>
                <button className="primary wide" disabled>
                  <ArrowUpRight size={17} />
                  Withdraw · Coming next
                </button>
                <p className="withdraw-note">
                  Address validation, network fees, confirmation and the
                  internal ledger will be connected in the next milestone.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
