import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Copy,
  ExternalLink,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
  Vote,
  Zap,
} from "lucide-react";
import {
  configuredChainId,
  contractAddress,
  createReadProvider,
  describeError,
  formatAddress,
  getInjectedProvider,
  getVotingContract,
  rpcUrl,
  type ElectionSnapshot,
} from "./contract";
import { gasSponsorshipConfigured, submitSponsoredVote } from "./sponsoredVoting";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

const networkName = configuredChainId === 11155111
  ? "Sepolia testnet"
  : configuredChainId === 31337
    ? "Local Anvil"
    : `Chain ${configuredChainId}`;

function App() {
  const [account, setAccount] = useState("");
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [election, setElection] = useState<ElectionSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [votingFor, setVotingFor] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [now, setNow] = useState(Date.now());

  const isCorrectNetwork = walletChainId === configuredChainId;
  const configured = Boolean(contractAddress && rpcUrl);
  const readProvider = useMemo(() => {
    if (!rpcUrl) return null;
    try {
      return createReadProvider();
    } catch {
      return null;
    }
  }, []);

  const loadElection = useCallback(async (walletAddress = account) => {
    if (!readProvider || !contractAddress) {
      setElection(null);
      return;
    }
    setLoading(true);
    try {
      const contract = getVotingContract(readProvider);
      const [title, deadline, totalVotes, candidateCount, isOpen, hasVoted] = await Promise.all([
        contract.title(),
        contract.deadline(),
        contract.totalVotes(),
        contract.candidateCount(),
        contract.isOpen(),
        walletAddress ? contract.hasVoted(walletAddress) : Promise.resolve(false),
      ]);
      const candidates = await Promise.all(
        Array.from({ length: Number(candidateCount) }, async (_, id) => {
          const [name, voteCount] = await contract.getCandidate(id);
          return { id, name: String(name), voteCount: Number(voteCount) };
        }),
      );
      setElection({
        title: String(title),
        deadline: Number(deadline) * 1000,
        totalVotes: Number(totalVotes),
        isOpen: Boolean(isOpen),
        candidates,
        hasVoted: Boolean(hasVoted),
      });
      setNotice((current) => current?.kind === "error" ? null : current);
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    } finally {
      setLoading(false);
    }
  }, [account, readProvider]);

  const connectWallet = async () => {
    setNotice(null);
    setConnecting(true);
    try {
      const provider = getInjectedProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      setAccount(accounts[0] || "");
      setWalletChainId(Number(network.chainId));
      if (Number(network.chainId) !== configuredChainId) {
        setNotice({ kind: "info", text: `Your wallet is on chain ${network.chainId}. Switch to ${networkName} to vote.` });
      } else {
        setNotice({ kind: "success", text: "Wallet connected. You approve every vote in MetaMask." });
      }
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    } finally {
      setConnecting(false);
    }
  };

  const switchNetwork = async () => {
    try {
      await window.ethereum?.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${configuredChainId.toString(16)}` }],
      });
    } catch (error) {
      setNotice({ kind: "error", text: `Couldn't switch networks automatically. Add ${networkName} to MetaMask, then retry. ${describeError(error)}` });
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    setWalletChainId(null);
    setNotice({ kind: "info", text: "Wallet disconnected from this app. To revoke site access, use MetaMask's connected-sites settings." });
  };

  const castVote = async (candidateId: number) => {
    if (!account) {
      setNotice({ kind: "error", text: "Connect MetaMask before voting." });
      return;
    }
    if (!isCorrectNetwork) {
      setNotice({ kind: "error", text: `Switch MetaMask to ${networkName} before voting.` });
      return;
    }
    setVotingFor(candidateId);
    setNotice({ kind: "info", text: "Confirm the transaction in MetaMask. Your vote is not submitted until you approve it." });
    try {
      if (gasSponsorshipConfigured) {
        setNotice({ kind: "info", text: "Approve the sponsored vote request in MetaMask. Alchemy will attempt to cover the gas if the policy allows it." });
        await submitSponsoredVote(account, candidateId);
        setNotice({ kind: "success", text: "Sponsored vote confirmed. The results below are refreshing." });
      } else {
        const provider = getInjectedProvider();
        const signer = await provider.getSigner();
        const contract = getVotingContract(provider).connect(signer);
        const tx = await contract.getFunction("vote")(candidateId);
        setNotice({ kind: "info", text: `Transaction submitted: ${tx.hash.slice(0, 12)}… Waiting for confirmation.` });
        await tx.wait();
        setNotice({ kind: "success", text: "Vote confirmed on-chain. The results below are refreshing." });
      }
      await loadElection(account);
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    } finally {
      setVotingFor(null);
    }
  };

  useEffect(() => {
    void loadElection();
  }, [loadElection]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[] | undefined;
      setAccount(accounts?.[0] || "");
    };
    const handleChain = (...args: unknown[]) => {
      const raw = args[0];
      setWalletChainId(typeof raw === "string" ? Number.parseInt(raw, 16) : null);
    };
    window.ethereum.on?.("accountsChanged", handleAccounts);
    window.ethereum.on?.("chainChanged", handleChain);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccounts);
      window.ethereum?.removeListener?.("chainChanged", handleChain);
    };
  }, []);

  useEffect(() => {
    if (account && isCorrectNetwork) void loadElection(account);
  }, [account, isCorrectNetwork, loadElection]);

  const deadlineLabel = election
    ? election.deadline <= now
      ? "Voting closed"
      : `Closes ${new Date(election.deadline).toLocaleString()}`
    : "Awaiting contract setup";


  const networkMismatch = Boolean(account && walletChainId !== null && !isCorrectNetwork);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Ballot home">
          <span className="brand-mark"><Vote size={21} strokeWidth={2.4} /></span>
          <span>ballot<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-right">
          <span className="network-pill"><span className="status-dot" />{networkName}</span>
          {account ? (
            <button className="wallet-button connected" onClick={disconnectWallet}>
              <span className="wallet-indicator" />
              {formatAddress(account)}
              <span className="wallet-caret">⌄</span>
            </button>
          ) : (
            <button className="wallet-button" onClick={connectWallet} disabled={connecting}>
              {connecting ? <LoaderCircle className="spin" size={16} /> : <Wallet size={16} />}
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> OPEN, TRANSPARENT, ON-CHAIN</div>
          <h1>Your voice.<br /><span>Verifiable by everyone.</span></h1>
          <p>A simple demonstration of on-chain voting. Connect a wallet, choose a candidate, and verify the result directly on the blockchain.</p>
          <div className="hero-actions">
            {!account && <button className="primary-button" onClick={connectWallet} disabled={connecting}>{connecting ? "Connecting…" : "Connect to participate"} <ArrowUpRight size={17} /></button>}
            <span className="hero-note"><ShieldCheck size={15} /> Every vote requires your approval</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="art-center"><Vote size={50} strokeWidth={1.35} /></div>
          <div className="float-card float-card-top"><span className="mini-icon mint"><Check size={14} /></span><span><b>On-chain</b><small>Publicly verifiable</small></span></div>
          <div className="float-card float-card-bottom"><span className="mini-icon lilac"><Fingerprint size={15} /></span><span><b>One wallet</b><small>One vote per address</small></span></div>
          <div className="art-spark spark-one">✳</div><div className="art-spark spark-two">✦</div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Election statistics">
        <article className="stat-card">
          <div className="stat-top"><span>Total votes</span><span className="stat-icon"><Vote size={17} /></span></div>
          <div className="stat-number">{election?.totalVotes ?? "—"}</div>
          <div className="stat-foot"><span className="tiny-dot mint-dot" /> Recorded on-chain</div>
        </article>
        <article className="stat-card">
          <div className="stat-top"><span>Candidates</span><span className="stat-icon"><Fingerprint size={17} /></span></div>
          <div className="stat-number">{election?.candidates.length ?? "—"}</div>
          <div className="stat-foot">Fixed at deployment</div>
        </article>
        <article className="stat-card stat-card-wide">
          <div className="stat-top"><span>Election status</span><span className="stat-icon"><Clock3 size={17} /></span></div>
          <div className="stat-status"><span className={election?.isOpen ? "status-dot" : "status-dot closed"} />{election ? (election.isOpen ? "Voting is open" : "Voting is closed") : "Not configured"}</div>
          <div className="stat-foot">{deadlineLabel}</div>
        </article>
      </section>

      {notice && (
        <div className={`notice notice-${notice.kind}`} role="status">
          {notice.kind === "success" ? <CheckCircle2 size={18} /> : notice.kind === "error" ? <AlertCircle size={18} /> : <CircleHelp size={18} />}
          <span>{notice.text}</span>
          <button aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      {!configured && (
        <section className="setup-banner">
          <div className="setup-icon"><Zap size={20} /></div>
          <div>
            <h3>One quick setup step</h3>
            <p>Add your Alchemy RPC URL and deployed contract address to <code>frontend/.env.local</code>. See <code>frontend/README.md</code> for setup instructions.</p>
          </div>
        </section>
      )}

      {networkMismatch && (
        <section className="network-warning">
          <AlertCircle size={18} />
          <div><b>Wrong network</b><span>Switch your wallet to {networkName} to submit a vote.</span></div>
          <button className="outline-button" onClick={switchNetwork}>Switch network</button>
        </section>
      )}

      <section className="section-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> THE BALLOT</div><h2>{election?.title || "Election candidates"}</h2><p>Choose the candidate you want to support. Your choice is submitted as a blockchain transaction.</p></div>
        <button className="refresh-button" onClick={() => void loadElection()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh</button>
      </section>

      {election?.candidates.length ? (
        <section className="candidate-grid">
          {election.candidates.map((candidate, index) => {
            const percentage = election.totalVotes ? (candidate.voteCount / election.totalVotes) * 100 : 0;
            const disabled = !account || !isCorrectNetwork || !election.isOpen || election.hasVoted || votingFor !== null;
            return (
              <article className={`candidate-card candidate-${index % 3}`} key={candidate.id}>
                <div className="candidate-top"><span className="candidate-number">CANDIDATE {String(index + 1).padStart(2, "0")}</span><span className="candidate-symbol">{["A", "B", "C", "D", "E"][index % 5]}</span></div>
                <h3>{candidate.name}</h3>
                <div className="vote-count"><strong>{candidate.voteCount}</strong><span>{candidate.voteCount === 1 ? "vote" : "votes"}</span></div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${percentage}%` }} /></div>
                <div className="candidate-foot"><span>{percentage.toFixed(0)}% of votes</span><span>{election.totalVotes} total</span></div>
                <button className={`vote-button ${election.hasVoted && account ? "vote-button-done" : ""}`} disabled={disabled} onClick={() => void castVote(candidate.id)}>
                  {votingFor === candidate.id ? <><LoaderCircle size={16} className="spin" /> Confirm in wallet…</> : election.hasVoted && account ? <><CheckCircle2 size={16} /> You've voted</> : !account ? <><Wallet size={16} /> Connect to vote</> : !election.isOpen ? "Voting closed" : <><Vote size={16} /> Vote for {candidate.name}</>}
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-state">
          <div className="empty-icon">{loading ? <LoaderCircle size={25} className="spin" /> : <ArrowDownToLine size={25} />}</div>
          <h3>{loading ? "Loading election…" : "Your ballot will appear here"}</h3>
          <p>{configured ? "We couldn't load a deployed election. Check the RPC URL, contract address, and selected network in your local environment file." : "Once you configure Alchemy and deploy the contract, this space will show live candidates and vote totals."}</p>
          {configured && <button className="outline-button" onClick={() => void loadElection()}><RefreshCw size={15} /> Try again</button>}
        </section>
      )}

      <section className="trust-row">
        <div className="trust-item"><span className="trust-icon"><LockKeyhole size={17} /></span><span><b>Wallet controlled</b><small>Private keys stay in MetaMask</small></span></div>
        <div className="trust-item"><span className="trust-icon"><Zap size={17} /></span><span><b>Alchemy RPC</b><small>Blockchain data access</small></span></div>
        <div className="trust-item"><span className="trust-icon"><ExternalLink size={17} /></span><span><b>Public results</b><small>Anyone can verify the contract</small></span></div>
      </section>

      <footer className="footer">
        <a className="brand footer-brand" href="#"><span className="brand-mark"><Vote size={18} /></span><span>ballot<span className="brand-dot">.</span></span></a>
        <span>Built for learning · Not for real elections</span>
        <button className="footer-link" onClick={() => void navigator.clipboard?.writeText(contractAddress)} disabled={!contractAddress}><Copy size={13} /> Copy contract address</button>
      </footer>
      <p className="disclaimer"><Sparkles size={13} /> Educational demo only. Wallet addresses are not verified identities; votes and voter addresses are publicly observable on-chain.</p>
    </main>
  );
}

export default App;
