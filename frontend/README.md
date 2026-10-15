# Frontend

This is the website part of the voting app. It uses React and TypeScript, and MetaMask is used to connect a wallet and approve votes. I kept the page pretty simple so the election info and voting flow are easy to follow.

## What you need

- Node.js 20 or newer
- npm
- MetaMask
- A deployed Voting contract on the network you want to use

## Set it up

From the repo root:

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `frontend/.env.local` and add your RPC URL, chain ID, and contract address. The frontend needs the address of a deployed contract before it can load an election.

## Use Sepolia

Sepolia is Ethereum's test network, so this is where you should try the app rather than using mainnet.

1. Create a Sepolia app in the Alchemy dashboard and copy its HTTPS RPC URL into `VITE_RPC_URL`.
2. Set `VITE_CHAIN_ID=11155111`.
3. Deploy the contract to Sepolia and put the address in `VITE_CONTRACT_ADDRESS`.
4. Switch MetaMask to Sepolia. You'll need test ETH if you're paying the transaction fee yourself or deploying the contract.
5. If you want to test gas sponsorship, create an Alchemy sponsorship policy for Sepolia and add the settings below.

```dotenv
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# Only needed for sponsored voting
VITE_ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
VITE_ALCHEMY_POLICY_ID=YOUR_SEPOLIA_POLICY_ID
```

Don't paste a real wallet private key or seed phrase into this file. The `VITE_` values are included in the browser build, so treat them as public settings. Restrict the Alchemy key by origin and usage where possible.

## Run it

```bash
npm run dev
```

Vite will print a local URL to open in your browser. If you change `.env.local`, restart the dev server.

To check the production build:

```bash
npm run build
npm run preview
```

## Local testing with Anvil

Run this from the repo root in one terminal:

```bash
anvil
```

In another terminal, deploy the contract to the local chain using the instructions in the root README. Set the frontend config to the local values:

```dotenv
VITE_RPC_URL=http://127.0.0.1:8545
VITE_CHAIN_ID=31337
VITE_CONTRACT_ADDRESS=0xYourLocallyDeployedContractAddress
```

Add Anvil to MetaMask as a custom network with RPC URL `http://127.0.0.1:8545` and chain ID `31337`. Only use the test accounts Anvil provides with this local chain.

## Where to look in the code

- `src/App.tsx` loads the election, handles the wallet connection, and submits votes.
- `src/contract.ts` has the contract ABI and connection settings.
- `src/sponsoredVoting.ts` handles the optional Alchemy Wallet APIs flow.
- `src/style.css` controls the layout and styling.

The longer explanation is in [the code walkthrough](../docs/CODE_WALKTHROUGH.md).

## Gas sponsorship

The app still uses MetaMask. Alchemy Wallet APIs is an optional path for asking Alchemy to cover the gas fee for a vote; this is not Account Kit embedded login.

To try it, create an active Sepolia gas sponsorship policy, make sure it allows this contract's `vote(uint256)` call, and set `VITE_ALCHEMY_API_KEY` and `VITE_ALCHEMY_POLICY_ID`. Restart the dev server and connect MetaMask on Sepolia. Alchemy decides whether a transaction fits the policy, so setting these values doesn't guarantee that every vote will be sponsored.

The first use may show a wallet authorization prompt related to EIP-7702. Read wallet prompts carefully and only approve requests you understand. Keep a test wallet with Sepolia ETH available in case sponsorship doesn't apply.

## If something goes wrong

- **It asks you to pay gas:** sponsorship may not be configured, or the call may not match the policy.
- **Sponsorship is rejected:** check that the policy is active, is for Sepolia, has budget left, and allows the deployed contract and vote call.
- **Wrong network:** check that MetaMask and `VITE_CHAIN_ID` both point to Sepolia (`11155111`) or both point to Anvil (`31337`).
- **The page can't load an election:** check the contract address and RPC URL, and make sure the contract was deployed to that network.
- **The vote doesn't appear in the results:** check whether the transaction succeeded and look at its revert reason if it failed.

This is an educational project, not a secure voting service. Results and wallet activity on a public blockchain can be seen by other people.
