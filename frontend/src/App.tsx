import { useCallback, useEffect, useMemo, useState } from "react";
import {
  configuredChainId, contractAddress, createReadProvider, describeError,
  formatAddress, getInjectedProvider, getVotingContract, rpcUrl,
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

const networkName = configuredChainId === 11155111 ? "Sepolia" :
  configuredChainId === 31337 ? "Local Anvil" : "Chain " + configuredChainId;

function App() {
  const [account, setAccount] = useState("");
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [election, setElection] = useState<ElectionSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [votingFor, setVotingFor] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);

  const isCorrectNetwork = walletChainId === configuredChainId;
  const configured = Boolean(contractAddress && rpcUrl);

  // RPC reads are separate from transactions signed by MetaMask.
  const readProvider = useMemo(() => {
    if (!rpcUrl) return null;
    try { return createReadProvider(); } catch { return null; }
  }, []);

  // Load the election and its candidate totals from the deployed contract.
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
      setNotice((current) => current?.kind === "error" ? null : current);
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    } finally { setLoading(false); }
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
      setNotice(Number(network.chainId) !== configuredChainId
        ? { kind: "info", text: "Switch MetaMask to " + networkName + " before voting." }
        : { kind: "success", text: "Wallet connected. Review and approve your vote in MetaMask." });
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    } finally { setConnecting(false); }
  };

  const switchNetwork = async () => {
    try {
      await window.ethereum?.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + configuredChainId.toString(16) }],
      });
    } catch (error) {
      setNotice({ kind: "error", text: "Switch MetaMask to " + networkName + " and try again. " + describeError(error) });
    }
  };

  const disconnectWallet = () => {
    // This clears the app's state. Site permissions are still managed in MetaMask.
    setAccount("");
    setWalletChainId(null);
    setNotice({ kind: "info", text: "Wallet disconnected from this app. You can revoke site access in MetaMask." });
  };

  const castVote = async (candidateId: number) => {
    if (!account) { setNotice({ kind: "error", text: "Connect MetaMask before voting." }); return; }
    if (!isCorrectNetwork) { setNotice({ kind: "error", text: "Switch MetaMask to " + networkName + " before voting." }); return; }
    setVotingFor(candidateId);
    setNotice({ kind: "info", text: gasSponsorshipConfigured
      ? "Review the MetaMask request carefully. Alchemy will sponsor gas only if the Sepolia policy allows this vote."
      : "Review the vote request in MetaMask. Your wallet will pay the transaction gas fee." });
    try {
      if (gasSponsorshipConfigured) {
        // Alchemy covers gas only when the active policy allows this transaction.
        await submitSponsoredVote(account, candidateId);
        setNotice({ kind: "success", text: "Sponsored vote confirmed. Refreshing results." });
      } else {
        // Without sponsorship, MetaMask sends the transaction and the wallet pays gas.
        const provider = getInjectedProvider();
        const signer = await provider.getSigner();
        const contract = getVotingContract(provider).connect(signer);
        const tx = await contract.getFunction("vote")(candidateId);
        setNotice({ kind: "info", text: "Transaction " + tx.hash.slice(0, 12) + "... submitted. Waiting for confirmation." });
        await tx.wait();
        setNotice({ kind: "success", text: "Vote confirmed. Refreshing results." });
      }
      await loadElection(account);
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error) });
    } finally { setVotingFor(null); }
  };

  useEffect(() => { void loadElection(); }, [loadElection]);

  useEffect(() => {
    if (!window.ethereum) return;
    // Keep the page in sync when the user changes account or network in MetaMask.
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

  const networkMismatch = Boolean(account && walletChainId !== null && !isCorrectNetwork);
  const deadlineText = election ? new Date(election.deadline).toLocaleString() : "Not available";

  return (
    <main className="page">
      <header className="site-header">
        <a className="wordmark" href="#top">Voting demo</a>
        <div className="header-actions">
          <span className="network-label">{networkName}</span>
          {account ? <>
            <span className="account-label" title={account}>{formatAddress(account)}</span>
            <button className="button button-secondary" onClick={disconnectWallet}>Disconnect</button>
          </> : <button className="button button-primary" onClick={connectWallet} disabled={connecting}>
            {connecting ? "Connecting..." : "Connect wallet"}
          </button>}
        </div>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">BLOCKCHAIN VOTING APPLICATION</p>
        <h1>{election?.title || "On-chain voting"}</h1>
        <p className="intro-copy">A small demo showing how a Solidity voting contract works. Connect MetaMask to cast a vote and read public results from the blockchain.</p>
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

      {networkMismatch && <section className="message-block warning">
        <h2>Wrong network</h2>
        <p>Your wallet needs to use {networkName} to vote on this contract.</p>
        <button className="button button-secondary" onClick={switchNetwork}>Switch network</button>
      </section>}

      <section className="election-summary" aria-label="Election summary">
        <div><span className="summary-label">Status</span><strong>{election ? (election.isOpen ? "Open" : "Closed") : "Not configured"}</strong></div>
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
            const disabled = !account || !isCorrectNetwork || !election.isOpen || election.hasVoted || votingFor !== null;
            return <article className="candidate-row" key={candidate.id}>
              <div className="candidate-main">
                <span className="candidate-id">Candidate {candidate.id + 1}</span>
                <h3>{candidate.name}</h3>
                <p>{candidate.voteCount} {candidate.voteCount === 1 ? "vote" : "votes"} · {percentage.toFixed(0)}%</p>
                <div className="vote-meter" aria-label={percentage.toFixed(0) + "% of votes"}><span style={{ width: percentage + "%" }} /></div>
              </div>
              <div className="candidate-action">
                <button className="button button-primary vote-button" disabled={disabled} onClick={() => void castVote(candidate.id)}>
                  {votingFor === candidate.id ? "Waiting for wallet..." :
                    election.hasVoted && account ? "Already voted" :
                    !account ? "Connect to vote" :
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
        <p>Reads use the configured RPC endpoint. {gasSponsorshipConfigured ? "Alchemy Wallet APIs sponsorship is configured for Sepolia, but coverage depends on the active policy. MetaMask still asks you to approve wallet actions." : "Normal MetaMask transactions are used, and the connected wallet pays gas."} Votes and wallet addresses are public on-chain.</p>
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
        <a href="https://github.com/henryrio08/blockchain-voting-app/blob/refactor/plain-voting-ui/frontend/README.md">Setup guide</a>
        <a href="https://github.com/henryrio08/blockchain-voting-app/blob/refactor/plain-voting-ui/docs/PRIVACY.md">Privacy</a>
        <a href="https://github.com/henryrio08/blockchain-voting-app/blob/refactor/plain-voting-ui/docs/TERMS.md">Terms</a>
      </footer>
    </main>
  );
}

export default App;
