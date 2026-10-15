# Voting dApp frontend

A small React and TypeScript interface for the educational Voting contract. The UI is intentionally simple so election data and the transaction flow are the main focus.

## Requirements

- Node.js 20 or newer
- npm
- MetaMask browser extension
- A deployed Voting contract on the network you configure

## Setup

From the repository root:

~~~bash
cd frontend
npm install
cp .env.example .env.local
~~~

Edit frontend/.env.local and set the RPC URL, chain ID, and deployed contract address.

### Sepolia

1. Create an Ethereum Sepolia app in the Alchemy dashboard.
2. Copy its HTTPS RPC URL into VITE_RPC_URL.
3. Set VITE_CHAIN_ID=11155111.
4. Deploy the contract to Sepolia and set VITE_CONTRACT_ADDRESS to the address printed by Foundry.
5. Add Sepolia to MetaMask and get test ETH for deployment or normal, unsponsored votes.
6. Create an Alchemy Gas Sponsorship policy for Sepolia. Add the policy ID and Alchemy API key below to enable sponsored votes.

Example:

~~~dotenv
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# Optional sponsorship
VITE_ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
VITE_ALCHEMY_POLICY_ID=YOUR_GAS_SPONSORSHIP_POLICY_ID
~~~

### Local Anvil

Start Anvil from the repository root in one terminal:

~~~bash
anvil
~~~

Configure the frontend for the local chain:

~~~dotenv
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_ID=31337
VITE_CONTRACT_ADDRESS=0xYourLocallyDeployedContractAddress
~~~

Add Anvil as a custom network in MetaMask with RPC URL http://127.0.0.1:8545 and chain ID 31337. Use only local development accounts with Anvil.

## Run and build

~~~bash
npm run dev
npm run build
npm run preview
~~~

Vite prints a local URL when the development server starts. Restart it after changing .env.local.

## How the code works

- src/App.tsx loads election information, connects MetaMask, checks the network, displays candidate totals, and submits votes.
- src/contract.ts holds the contract ABI and environment configuration. It creates the RPC and MetaMask providers.
- src/sponsoredVoting.ts handles the optional Alchemy Wallet APIs path. If sponsorship is not configured, the app sends a normal MetaMask transaction.
- src/style.css contains the responsive layout and visual styling.

For a deeper explanation of the contract, tests, wallet flow, gas sponsorship, and security limits, read ../docs/CODE_WALKTHROUGH.md.

## Security and privacy notes

The app does not ask for or handle private keys. VITE_ variables are included in browser code, so the Alchemy API key and policy ID are public configuration. Restrict the API key by origin and usage in Alchemy where possible.

The app does not collect an account profile or send data to a project-owned backend. Blockchain transactions and wallet addresses are public. Using the app requires MetaMask and the configured RPC provider. This is not a secure election system and should not be used for real elections.


## Alchemy gas sponsorship (Wallet APIs)

This project uses `@alchemy/wallet-apis`, Alchemy's current Wallet APIs SDK and the recommended successor to the older Account Kit wallet client. It adds gas sponsorship to the existing MetaMask connection; it does **not** add Account Kit's embedded-wallet or social-login UI.

1. In the Alchemy dashboard, create an Ethereum Sepolia app and a Gas Sponsorship policy for Sepolia.
2. Configure the policy to allow the deployed Voting contract and the `vote(uint256)` call, and set appropriate limits.
3. Copy the Alchemy API key and policy ID into `frontend/.env.local`:
   ```dotenv
   VITE_ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
   VITE_ALCHEMY_POLICY_ID=YOUR_SEPOLIA_POLICY_ID
   ```
4. Confirm `VITE_CHAIN_ID=11155111`, the RPC URL and deployed contract address are all for Sepolia.
5. Restart Vite, connect MetaMask on Sepolia, and try a vote with an eligible test wallet.

The frontend requests sponsorship through the policy configured on the Wallet APIs client. Alchemy's policy engine decides whether to sponsor each call; having the ID in the environment does not guarantee coverage. The first Wallet APIs transaction may request an EIP-7702 wallet authorization in MetaMask. Read the wallet prompt carefully and only approve it if you understand what is being requested.

The API key and policy ID are browser-visible because of the `VITE_` prefix. Do not put a private key or seed phrase here. Restrict the API key by allowed origins/usage where possible. Keep an unsponsored test wallet with Sepolia ETH available as a fallback while testing.

### Troubleshooting sponsorship

- **Falls back to normal MetaMask gas:** one or both sponsorship environment values are missing; restart Vite after adding them.
- **Sponsorship request rejected:** check that the policy is active, has remaining budget/limits, targets Sepolia, and allows the deployed contract and call.
- **Wallet or chain error:** reconnect MetaMask and verify chain ID 11155111.
- **First-use authorization prompt:** Wallet APIs may use EIP-7702 to enable smart-wallet features for the existing EOA. Review the prompt before signing.
- **Call submitted but results did not change:** check the Wallet APIs call status and the contract revert reason; a returned call ID by itself is not proof of a successful vote.
