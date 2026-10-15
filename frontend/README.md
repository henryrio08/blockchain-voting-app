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
6. Optional: create an active Alchemy Gas Sponsorship policy for Sepolia, then set VITE_ALCHEMY_API_KEY and VITE_ALCHEMY_POLICY_ID.

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
