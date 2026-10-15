import {
  alchemyWalletTransport,
  createSmartWalletClient,
} from "@alchemy/wallet-apis";
import {
  createWalletClient,
  custom,
  encodeFunctionData,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import { contractAddress } from "./contract";

// VITE_ values are public browser configuration, not private credentials.
const alchemyApiKey = (import.meta.env.VITE_ALCHEMY_API_KEY || "").trim();
const sponsorshipPolicyId = (import.meta.env.VITE_ALCHEMY_POLICY_ID || "").trim();

const votingAbi = [
  {
    type: "function",
    name: "vote",
    stateMutability: "nonpayable",
    inputs: [{ name: "candidateId", type: "uint256" }],
    outputs: [],
  },
] as const;

// The app uses a normal MetaMask transaction if sponsorship isn't configured.
export const gasSponsorshipConfigured = Boolean(alchemyApiKey && sponsorshipPolicyId);

export async function submitSponsoredVote(account: string, candidateId: number) {
  if (!alchemyApiKey || !sponsorshipPolicyId) {
    throw new Error(
      "Gas sponsorship is not configured. Add VITE_ALCHEMY_API_KEY and VITE_ALCHEMY_POLICY_ID to frontend/.env.local.",
    );
  }
  if (Number(import.meta.env.VITE_CHAIN_ID || "11155111") !== 11155111) {
    throw new Error("Alchemy gas sponsorship is currently configured for Sepolia only.");
  }
  if (!window.ethereum) {
    throw new Error("MetaMask was not found. Install the extension and try again.");
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    throw new Error("Set VITE_CONTRACT_ADDRESS to the deployed Voting contract address.");
  }
  if (!Number.isSafeInteger(candidateId) || candidateId < 0) {
    throw new Error("The selected candidate ID is invalid.");
  }

  // Check the live wallet state again right before asking it to sign.
  // This catches account/network changes that happen after the UI was rendered.
  const [chainId, accounts] = await Promise.all([
    window.ethereum.request({ method: "eth_chainId" }),
    window.ethereum.request({ method: "eth_accounts" }),
  ]);
  if (typeof chainId !== "string" || Number.parseInt(chainId, 16) !== 11155111) {
    throw new Error("Switch MetaMask to Sepolia before requesting gas sponsorship.");
  }
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" ||
      accounts[0].toLowerCase() !== account.toLowerCase()) {
    throw new Error("Your active MetaMask account changed. Reconnect your wallet and try again.");
  }

  // MetaMask remains the signer; the app never handles the wallet's private key.
  // Wallet APIs (the current successor to Account Kit's older wallet client)
  // handle the smart-wallet transaction flow and request policy-based sponsorship.
  const signer = createWalletClient({
    account: account as Address,
    chain: sepolia,
    transport: custom(window.ethereum as never),
  });
  const client = createSmartWalletClient({
    transport: alchemyWalletTransport({ apiKey: alchemyApiKey }),
    chain: sepolia,
    signer,
    // Configure the sponsorship policy on the client using the current v5 SDK API.
    paymaster: { policyId: sponsorshipPolicyId },
  });

  // Encode vote(candidateId) using the function signature in Voting.sol.
  const data = encodeFunctionData({
    abi: votingAbi,
    functionName: "vote",
    args: [BigInt(candidateId)],
  });

  // The policy decides whether this call is eligible. If it isn't, this fails
  // rather than silently claiming the vote was sponsored.
  const { id } = await client.sendCalls({
    calls: [
      {
        to: contractAddress as Address,
        data,
        value: 0n,
      },
    ],
  });

  // A call ID is not a transaction hash. Wait for Alchemy's status before
  // returning so the UI only reports success after the call flow completes.
  await client.waitForCallsStatus({ id });
  return id;
}
