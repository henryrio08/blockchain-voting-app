import { useCallback, useEffect, useMemo, useState } from "react";
import { toViemAccount, usePrivy, useWallets } from "@privy-io/react-auth";
import type { LocalAccount } from "viem";
import {
  configuredChainId, contractAddress, createReadProvider, describeError,
  formatAddress, getVotingContract, rpcUrl,
  type ElectionSnapshot,
} from "./contract";
import { gasSponsorshipConfigured, submitSponsoredVote } from "./sponsoredVoting";

const networkName = configuredChainId === 11155111 ? "Sepolia" :
  configuredChainId === 31337 ? "Local Anvil" : "Chain " + configuredChainId;

function App() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  // Privy creates an embedded wallet after sign-in. Do not fall back to an injected wallet.
  const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === "privy");
  const account = embeddedWallet?.address || "";
  const [signer, setSigner] = useState<LocalAccount>();
  const [election, setElection] = useState<ElectionSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [votingFor, setVotingFor] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);

  const isCorrectNetwork = configuredChainId === 11155111;
  const configured = Boolean(contractAddress && rpcUrl);
  const canVote = ready && authenticated && Boolean(account && signer) &&
    isCorrectNetwork && gasSponsorshipConfigured;

  // Contract reads use the public RPC endpoint and do not need a connected wallet.
  const readProvider = useMemo(() => {
    if (!rpcUrl) return null;
    try { return createReadProvider(); } catch { return null; }
  }, []);

  // Convert the Privy embedded wallet into a viem signer for Alchemy Wallet APIs.
  // Privy handles login and key custody; this app never sees the wallet's private key.
  useEffect(() => {
    let cancelled = false;
    if (!authenticated || !embeddedWallet) {
      setSigner(undefined);
      return () => { cancelled = true; };
    }

    setSigner(undefined);
    void toViemAccount({ wallet: embeddedWallet })
      .then((nextSigner) => {
        if (!cancelled) setSigner(nextSigner);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSigner(undefined);
          setNotice({ kind: "error", text: "Could not prepare the embedded wallet. " + describeError(error) });
        }
      });

    return () => { cancelled = true; };
  }, [authenticated, embeddedWallet?.address]);

  // Load election details and whether this embedded wallet has already voted.
  const loadElection = useCallback(async (walletAddress = account) => {
    if (!readProvider || !contractAddress) { setElection(null); return; }
    setLoading(true);
    try {
      const contract = getVotingContract(readProvider);
      const [title, deadline, totalVotes, candidateCount, isOpen, hasVoted] = await Promise.all([
        contract.title(), contract.deadline(), contract.totalVotes(), contract.candidateCount(),
        contract.isOpen(), walletAddress ? contract.hasVoted(walletAddress) : Promise.resolve(false),
      ]);
      const candidates = await Promise.all(Array.from({ length: Number(candidateCount) }, async (_, id) => {
        const [name, voteCount] = await contract.getCandidate(id);
        return { id, name: String(name), voteCount: Number(voteCount) };
      }));
      setElection({
        title: String(title), deadline: Number(deadline) * 1000, totalVotes: Number(totalVotes),
        isOpen: Boolean(isOpen), candidates, hasVoted: Boolean(hasVoted),
      });
      setNotice((current) => current?.kind === "error" ? current : null);
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    } finally { setLoading(false); }
  }, [account, readProvider]);

  const startLogin = async () => {
    setNotice(null);
    try {
      await login();
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    }
  };

  const disconnectWallet = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setSigner(undefined);
      setNotice({ kind: "info", text: "You have signed out. Your embedded wallet remains managed by Privy." });
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    } finally { setLoggingOut(false); }
  };

  const castVote = async (candidateId: number) => {
    if (!authenticated || !account) {
      setNotice({ kind: "error", text: "Sign in to create or access your embedded wallet before voting." });
      return;
    }
    if (!signer) {
      setNotice({ kind: "info", text: "Your embedded wallet is still getting ready. Try again in a moment." });
      return;
    }
    if (!isCorrectNetwork) {
      setNotice({ kind: "error", text: "This demo is configured for Sepolia. Set VITE_CHAIN_ID=11155111." });
      return;
    }
    if (!gasSponsorshipConfigured) {
      setNotice({ kind: "error", text: "Gas sponsorship is not configured. Add VITE_ALCHEMY_API_KEY and VITE_ALCHEMY_POLICY_ID to frontend/.env.local." });
      return;
    }

    setVotingFor(candidateId);
    setNotice({ kind: "info", text: "Review the transaction details. Alchemy will sponsor gas only if your Sepolia policy allows this vote." });
    try {
      const transactionHash = await submitSponsoredVote(signer, candidateId);
      setNotice({
        kind: "success",
        text: transactionHash
          ? "Sponsored vote confirmed. Transaction: " + transactionHash.slice(0, 12) + "… Refreshing results."
          : "Sponsored vote confirmed. Refreshing results.",
      });
      await loadElection(account);
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    } finally {
      setVotingFor(null);
    }
  };

  useEffect(() => { void loadElection(account); }, [loadElection]);

  const deadlineText = election ? new Date(election.deadline).toLocaleString() : "Not available";
  const walletReady = Boolean(signer && account);

  return (
    <main className="page">
      <header className="site-header">
        <a className="wordmark" href="#top">Voting demo</a>
        <div className="header-actions">
          <span className="network-label">{networkName}</span>
          {authenticated && account ? <>
            <span className="account-label" title={account}>Embedded wallet {formatAddress(account)}</span>
            <button className="button button-secondary" onClick={() => void disconnectWallet()} disabled={loggingOut}>
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </> : <button className="button button-primary" onClick={() => void startLogin()} disabled={!ready}>
            {!ready ? "Loading..." : "Sign in"}
          </button>}
        </div>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">BLOCKCHAIN VOTING APPLICATION</p>
        <h1>{election?.title || "On-chain voting"}</h1>
        <p className="intro-copy">
          A small demo showing how a Solidity voting contract works. Sign in with email or Google to use an embedded wallet.
          Eligible votes are submitted through Alchemy Wallet APIs, with gas sponsorship subject to the Sepolia policy.
        </p>
      </section>

      {notice && <div className={"notice notice-" + notice.kind} role="status">
        <p>{notice.text}</p>
        <button className="text-button" aria-label="Dismiss message" onClick={() => setNotice(null)}>Dismiss</button>
      </div>}

      {!configured && <section className="message-block">
        <h2>Setup needed</h2>
        <p>Set <code>VITE_RPC_URL</code> and <code>VITE_CONTRACT_ADDRESS</code> in <code>frontend/.env.local</code>.</p>
        <a href="https://github.com/henryrio08/blockchain-voting-app/blob/main/frontend/README.md">Read setup instructions</a>
      </section>}

      {!isCorrectNetwork && <section className="message-block warning">
        <h2>Network configuration needs attention</h2>
        <p>This version uses embedded wallets on Sepolia. Set <code>VITE_CHAIN_ID=11155111</code> and use a Sepolia RPC URL.</p>
      </section>}

      {!gasSponsorshipConfigured && <section className="message-block warning">
        <h2>Gas sponsorship setup needed</h2>
        <p>Set <code>VITE_ALCHEMY_API_KEY</code> and <code>VITE_ALCHEMY_POLICY_ID</code> after linking an active Sepolia policy to your Alchemy app. Voting stays disabled until these values are configured.</p>
      </section>}

      {authenticated && !walletReady && <section className="message-block">
        <h2>Preparing your embedded wallet</h2>
        <p>Sign-in succeeded. Privy is making the wallet signer ready for sponsored transactions; this normally takes a moment.</p>
      </section>}

      <section className="election-summary" aria-label="Election summary">
        <div><span className="summary-label">Status</span><strong>{election ? (election.isOpen ? "Open" : "Closed") : "Not available"}</strong></div>
        <div><span className="summary-label">Total votes</span><strong>{election ? election.totalVotes : "..."}</strong></div>
        <div><span className="summary-label">Candidates</span><strong>{election ? election.candidates.length : "..."}</strong></div>
        <div><span className="summary-label">Deadline</span><strong className="deadline-value">{deadlineText}</strong></div>
      </section>

      <section className="ballot-section">
        <div className="section-heading">
          <div><h2>Candidates</h2><p>Candidate names and vote counts come from the deployed contract.</p></div>
          <button className="button button-secondary" onClick={() => void loadElection()} disabled={loading}>{loading ? "Refreshing..." : "Refresh results"}</button>
        </div>

        {election?.candidates.length ? <div className="candidate-list">
          {election.candidates.map((candidate) => {
            const percentage = election.totalVotes ? (candidate.voteCount / election.totalVotes) * 100 : 0;
            const disabled = !canVote || !election.isOpen || election.hasVoted || votingFor !== null;
            return <article className="candidate-row" key={candidate.id}>
              <div className="candidate-main">
                <span className="candidate-id">Candidate {candidate.id + 1}</span>
                <h3>{candidate.name}</h3>
                <p>{candidate.voteCount} {candidate.voteCount === 1 ? "vote" : "votes"} · {percentage.toFixed(0)}%</p>
                <div className="vote-meter" aria-label={percentage.toFixed(0) + "% of votes"}><span style={{ width: percentage + "%" }} /></div>
              </div>
              <div className="candidate-action">
                <button className="button button-primary vote-button" disabled={disabled} onClick={() => void castVote(candidate.id)}>
                  {votingFor === candidate.id ? "Submitting vote..." :
                    election.hasVoted && account ? "Already voted" :
                    !authenticated ? "Sign in to vote" :
                    !walletReady ? "Preparing wallet..." :
                    !gasSponsorshipConfigured ? "Sponsorship setup needed" :
                    !election.isOpen ? "Voting closed" : "Vote"}
                </button>
              </div>
            </article>;
          })}
        </div> : <div className="empty-state">
          <h3>{loading ? "Loading election" : "No election data yet"}</h3>
          <p>{configured
            ? "The contract could not be read. Check that the RPC endpoint, chain ID, and contract address all refer to the same network."
            : "After deploying the contract, add its address to your local environment file and refresh this page."}</p>
          {configured && <button className="button button-secondary" onClick={() => void loadElection()} disabled={loading}>Try again</button>}
        </div>}
      </section>

      <section className="project-notes">
        <h2>How this demo works</h2>
        <p>Reads use the configured RPC endpoint. Privy manages embedded-wallet sign-in and key custody. Alchemy Wallet APIs submits vote calls and requests policy-based gas sponsorship; the policy decides which calls it will cover. Votes and wallet addresses are public on-chain.</p>
        <div className="contract-address">
          <span>Contract address</span>
          <code>{contractAddress || "Not configured"}</code>
          <button className="text-button" disabled={!contractAddress} onClick={() => void navigator.clipboard?.writeText(contractAddress)}>Copy address</button>
        </div>
        <p className="small-note">For learning only. This is not a secure election system. Wallets do not prove identity or eligibility, and one person can use multiple wallets.</p>
      </section>

      <footer className="site-footer">
        <span>Voting demo · Built for learning</span>
        <a href="https://github.com/henryrio08/blockchain-voting-app">Source code</a>
        <a href="https://github.com/henryrio08/blockchain-voting-app/blob/main/frontend/README.md">Setup guide</a>
        <a href="https://github.com/henryrio08/blockchain-voting-app/blob/main/docs/PRIVACY.md">Privacy</a>
        <a href="https://github.com/henryrio08/blockchain-voting-app/blob/main/docs/TERMS.md">Terms</a>
      </footer>
    </main>
  );
}

export default App;
