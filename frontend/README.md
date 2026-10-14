# Voting dApp frontend

A React + TypeScript frontend for the educational Voting contract. MetaMask signs transactions; the configured RPC endpoint (Alchemy on Sepolia, or Anvil locally) is used to read the contract.

## Requirements

- Node.js 20 or newer
- npm
- MetaMask browser extension
- A deployed instance of `src/Voting.sol` on the network you configure

## Setup

From the repository root:

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `.env.local` and set the RPC URL, chain ID, and deployed contract address.

### Sepolia testnet with Alchemy

1. Create an app for Ethereum Sepolia in the [Alchemy dashboard](https://dashboard.alchemy.com/).
2. Copy its HTTPS RPC URL into `VITE_RPC_URL`.
3. Set `VITE_CHAIN_ID=11155111`.
4. Deploy the contract to Sepolia with a disposable test wallet and put the resulting address in `VITE_CONTRACT_ADDRESS`.
5. Add Sepolia to MetaMask and obtain Sepolia test ETH from a reputable faucet.

Example:

```dotenv
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

### Local Anvil

Start a local chain from the repository root in one terminal:

```bash
anvil
```

In `frontend/.env.local`, use:

```dotenv
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_ID=31337
VITE_CONTRACT_ADDRESS=0xYourLocallyDeployedContractAddress
```

Add Anvil as a custom network in MetaMask:
- Network name: Anvil Local
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Deploy the contract locally using the repository's Foundry deployment script. Use only an Anvil development account with test ETH; Anvil private keys are public and must never be used on a real network.

## Run the app

```bash
npm run dev
```

Open the local URL Vite prints. To check the production build:

```bash
npm run build
npm run preview
```

## Architecture

- `src/contract.ts`: minimal ABI, chain configuration, and provider helpers.
- Alchemy/local RPC provider: reads election data without requiring a wallet connection.
- MetaMask: exposes the connected account, signs vote transactions, and asks the user to approve each transaction.
- `src/App.tsx`: election dashboard, candidate vote counts, wallet/network handling, and transaction feedback.

The app never asks for or handles a private key. The Alchemy key is embedded in frontend browser requests because Vite's `VITE_*` variables are public client-side configuration, not secrets. Restrict the Alchemy key by allowed origins and usage limits in the Alchemy dashboard; never put a wallet private key in a `VITE_*` variable.

## Limitations

This is an educational demonstration, not a secure election system. Wallet addresses do not establish voter identity or eligibility, one person can use multiple wallets, and on-chain votes are public. The contract has not been professionally audited. The UI must be configured with a deployed contract on the same network selected in MetaMask.
