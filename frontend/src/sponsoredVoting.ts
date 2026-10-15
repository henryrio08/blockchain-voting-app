import {
  alchemyWalletTransport,
  createSmartWalletClient,
} from "@alchemy/wallet-apis";
import {
  encodeFunctionData,
  type Address,
  type LocalAccount,
} from "viem";
import { sepolia } from "viem/chains";
import { contractAddress } from "./contract";

// VITE_ values are visible in the browser. They are configuration, not wallet secrets.
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

export const gasSponsorshipConfigured = Boolean(alchemyApiKey && sponsorshipPolicyId);

// Send the call with the Privy embedded wallet as signer. Alchemy handles the
// smart-wallet transaction flow and asks the configured policy to sponsor gas.
export async function submitSponsoredVote(signer: LocalAccount, candidateId: number) {
  if (!alchemyApiKey || !sponsorshipPolicyId) {
    throw new Error(
      "Gas sponsorship is not configured. Add VITE_ALCHEMY_API_KEY and VITE_ALCHEMY_POLICY_ID to frontend/.env.local.",
    );
  }
  if (Number(import.meta.env.VITE_CHAIN_ID || "11155111") !== 11155111) {
    throw new Error("Embedded-wallet voting is currently configured for Sepolia only.");
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    throw new Error("Set VITE_CONTRACT_ADDRESS to the deployed Voting contract address.");
  }
  if (!Number.isSafeInteger(candidateId) || candidateId < 0) {
    throw new Error("The selected candidate ID is invalid.");
  }

  // The signer comes from Privy's embedded wallet; no injected browser wallet is used.
  const client = createSmartWalletClient({
    transport: alchemyWalletTransport({ apiKey: alchemyApiKey }),
    chain: sepolia,
    signer,
    paymaster: { policyId: sponsorshipPolicyId },
  });

  // Encode vote(candidateId) using the function signature in Voting.sol.
  const data = encodeFunctionData({
    abi: votingAbi,
    functionName: "vote",
    args: [BigInt(candidateId)],
  });

  // A configured policy does not guarantee coverage: Alchemy checks its rules and limits.
  const { id } = await client.sendCalls({
    calls: [
      {
        to: contractAddress as Address,
        data,
        value: 0n,
      },
    ],
  });

  // Do not report success just because Alchemy returned a call ID.
  const result = await client.waitForCallsStatus({ id });
  if (result.status !== "success") {
    throw new Error("The sponsored vote transaction did not succeed. Check the Alchemy policy and transaction status.");
  }

  return result.receipts?.[0]?.transactionHash;
}
