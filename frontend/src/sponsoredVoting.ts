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

// These settings are public in the browser bundle. Restrict the API key in Alchemy.
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

// If either setting is missing, App.tsx falls back to a normal MetaMask transaction.
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

  // MetaMask remains the signer. Alchemy routes the signed call through its
  // smart-wallet infrastructure so an eligible policy can cover transaction gas.
  // MetaMask is still the signer. The app never handles the wallet's private key.
  const signer = createWalletClient({
    account: account as Address,
    chain: sepolia,
    transport: custom(window.ethereum as never),
  });
  const client = createSmartWalletClient({
    transport: alchemyWalletTransport({ apiKey: alchemyApiKey }),
    chain: sepolia,
    signer,
  });

  // Encode vote(candidateId) using the same function signature as the Solidity contract.
  const data = encodeFunctionData({
    abi: votingAbi,
    functionName: "vote",
    args: [BigInt(candidateId)],
  });

  // Ask Alchemy to sponsor this call if the policy rules allow it.
  const { id } = await client.sendCalls({
    capabilities: {
      paymaster: {
        policyId: sponsorshipPolicyId,
      },
    },
    calls: [
      {
        to: contractAddress as Address,
        data,
        value: 0n,
      },
    ],
  });

  // A returned call ID means the request was accepted, not yet confirmed.
  await client.waitForCallsStatus({ id });
  return id;
}
