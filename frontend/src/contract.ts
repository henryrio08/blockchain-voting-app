import { Contract, JsonRpcProvider, BrowserProvider } from "ethers";

// This is the small list of contract functions the frontend needs to call.
export const votingAbi = [
  "function title() view returns (string)",
  "function deadline() view returns (uint256)",
  "function totalVotes() view returns (uint256)",
  "function candidateCount() view returns (uint256)",
  "function getCandidate(uint256 candidateId) view returns (string name, uint256 voteCount)",
  "function hasVoted(address voter) view returns (bool)",
  "function vote(uint256 candidateId)",
  "function isOpen() view returns (bool)",
  "event VoteCast(address indexed voter, uint256 indexed candidateId)",
] as const;

// Vite exposes VITE_ values in the browser, so these are configuration, not secrets.
export const configuredChainId = Number(import.meta.env.VITE_CHAIN_ID || "11155111");
export const contractAddress = (import.meta.env.VITE_CONTRACT_ADDRESS || "").trim();
export const rpcUrl = (import.meta.env.VITE_RPC_URL || "").trim();

export type Candidate = {
  id: number;
  name: string;
  voteCount: number;
};

export type ElectionSnapshot = {
  title: string;
  deadline: number;
  totalVotes: number;
  isOpen: boolean;
  candidates: Candidate[];
  hasVoted: boolean;
};

// Use the RPC endpoint for reading data without asking the user to connect a wallet.
export function createReadProvider() {
  if (!rpcUrl) {
    throw new Error("Add VITE_RPC_URL to frontend/.env.local to configure your Alchemy or local RPC endpoint.");
  }

  return new JsonRpcProvider(rpcUrl, configuredChainId, { staticNetwork: true });
}

// MetaMask handles the private key and asks the user before signing a transaction.
export function getInjectedProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask was not found. Install the MetaMask browser extension and try again.");
  }

  return new BrowserProvider(window.ethereum);
}

// Keep the address check here so a missing or mistyped address fails with a useful message.
export function getVotingContract(provider: JsonRpcProvider | BrowserProvider) {
  if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    throw new Error("Set VITE_CONTRACT_ADDRESS in frontend/.env.local to your deployed Voting contract address.");
  }

  return new Contract(contractAddress, votingAbi, provider);
}

export function formatAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function describeError(error: unknown): string {
  if (typeof error === "object" && error !== null && "shortMessage" in error) {
    return String((error as { shortMessage: unknown }).shortMessage);
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Check the wallet and network, then try again.";
}
