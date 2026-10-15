# Voting dApp frontend

A small React and TypeScript interface for the educational Voting contract. The UI is intentionally simple so election data and the transaction flow are the main focus.

## Requirements

- Node.js 20 or newer
- npm
- A Privy application with email and Google login enabled
- An Alchemy app with Ethereum Sepolia RPC access and a gas sponsorship policy
- A deployed Voting contract on Sepolia

## Setup

From the repository root:

~~~bash
cd frontend
npm install
cp .env.example .env.local
~~~

Edit `frontend/.env.local` with the app ID, RPC URL, chain ID, contract address, and sponsorship policy settings.

### Configure Privy embedded wallets

1. Open the [Privy dashboard](https://dashboard.privy.io/) and create an application.
2. Enable **Email** and **Google** in the application's login methods.
3. Copy the Privy app ID into `VITE_PRIVY_APP_ID`.
4. This frontend configures Privy to create an embedded Ethereum wallet after login. Users do not need MetaMask or another browser wallet extension.

### Configure Sepolia and gas sponsorship

1. Create an Ethereum Sepolia app in the [Alchemy dashboard](https://dashboard.alchemy.com/).
2. Copy its HTTPS RPC URL into `VITE_RPC_URL`.
3. Set `VITE_CHAIN_ID=11155111`.
4. Deploy the contract to Sepolia and set `VITE_CONTRACT_ADDRESS` to the deployed address.
5. Create an Alchemy gas sponsorship policy for Sepolia and link it to the same Alchemy app/API key.
6. Configure the policy to allow the deployed Voting contract and its `vote(uint256)` function. Set suitable limits.
7. Set the Privy app ID, Alchemy API key, and policy ID in `frontend/.env.local`:

~~~dotenv
VITE_PRIVY_APP_ID=YOUR_PRIVY_APP_ID
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
VITE_ALCHEMY_POLICY_ID=YOUR_SEPOLIA_POLICY_ID
~~~

Restart Vite after changing environment variables:

~~~bash
npm run dev
~~~

The app uses Privy for authentication and embedded-wallet key custody. Alchemy Wallet APIs uses that wallet signer to submit votes and request gas sponsorship. A policy can reject calls or stop sponsoring when its budget/limits are reached, so a configured policy does not guarantee every transaction is gasless.

### Local Anvil

Local Anvil is useful for testing the Solidity contract and read-only frontend work, but this frontend's embedded-wallet transaction flow is configured for Sepolia sponsorship.

Start Anvil from the repository root:

~~~bash
anvil
~~~

To vote through the embedded wallet, deploy to Sepolia and configure a matching Sepolia contract address and sponsorship policy.

## Run and build

~~~bash
npm run dev
npm run build
npm run preview
~~~

Vite prints a local URL when the development server starts.

## How the code works

- `src/main.tsx` configures Privy and creates embedded wallets after email or Google sign-in.
- `src/App.tsx` manages login, the embedded-wallet signer, election reads, vote submission, and results.
- `src/contract.ts` holds the contract ABI and environment configuration and creates the read-only RPC provider.
- `src/sponsoredVoting.ts` sends the encoded vote call through Alchemy Wallet APIs with the configured gas policy.
- `src/style.css` contains the responsive layout and visual styling.

For a deeper explanation of the contract and transaction flow, read [the code walkthrough](../docs/CODE_WALKTHROUGH.md).

## Security and privacy notes

- Privy handles login and embedded-wallet key custody. The app never requests a seed phrase or private key.
- Variables prefixed with `VITE_` are bundled into browser code. The Privy app ID, Alchemy API key, and policy ID are not wallet secrets, but restrict the Alchemy API key by origin and usage in the dashboard.
- Never put a wallet private key or seed phrase in a frontend environment file.
- Blockchain transactions and wallet addresses are public. The app does not provide ballot secrecy, identity verification, voter eligibility checks, or coercion resistance.
- This is an educational demo, not a secure election system.

## Troubleshooting

- **The sign-in page is missing:** set `VITE_PRIVY_APP_ID`, enable email and Google login in Privy, and restart Vite.
- **Login succeeds but no wallet appears:** check that embedded Ethereum wallets are enabled for the Privy app and wait for wallet setup to finish.
- **Votes are disabled:** set both `VITE_ALCHEMY_API_KEY` and `VITE_ALCHEMY_POLICY_ID`, then restart Vite.
- **Alchemy rejects sponsorship:** make sure the policy is active, linked to the same Alchemy app, configured for Sepolia, and allows the deployed contract and `vote(uint256)` call.
- **Election data is unavailable:** check that the RPC URL, chain ID, and deployed contract address all refer to Sepolia.
