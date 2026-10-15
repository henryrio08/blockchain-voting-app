# Code walkthrough

This guide explains how the voting app works from the Solidity contract to the browser. The code comments explain why each step exists, in plain language.

## How the pieces fit together

1. `Voting.sol` stores the election title, candidate list, deadline, and vote counts.
2. Foundry compiles and tests the contract. A deployment command puts a copy of it on a blockchain.
3. `frontend/src/contract.ts` tells the frontend which contract functions exist and how to read them from the network.
4. `frontend/src/main.tsx` initializes Privy and enables email/Google sign-in with embedded Ethereum wallets.
5. `frontend/src/App.tsx` loads the election, prepares the embedded-wallet signer, and handles the vote button.
6. `frontend/src/sponsoredVoting.ts` submits the vote through Alchemy Wallet APIs and requests policy-based gas sponsorship.

## Repository map

| File | What it does |
| --- | --- |
| `src/Voting.sol` | The rules for an election and the data stored on-chain. |
| `test/Voting.t.sol` | Tests for valid votes and cases the contract should reject. |
| `script/DeployVoting.s.sol` | Foundry deployment script and example election setup. |
| `foundry.toml` | Foundry compiler, test, and project settings. |
| `.github/workflows/ci.yml` | Runs formatting, compilation, contract tests, and frontend build on GitHub. |
| `frontend/src/main.tsx` | Wraps the app in Privy's provider and configures embedded-wallet login. |
| `frontend/src/App.tsx` | Page layout, authentication state, election reads, and vote UI. |
| `frontend/src/contract.ts` | Contract ABI, environment values, read provider, and error formatting. |
| `frontend/src/sponsoredVoting.ts` | Alchemy Wallet APIs flow for sponsored voting on Sepolia. |
| `frontend/src/style.css` | Page layout, colors, type, responsive rules, and focus styles. |
| `frontend/.env.example` | Template for local frontend configuration. |

## 1. The smart contract

`src/Voting.sol` is the source of truth for the election.

### Constructor

When the contract is deployed, the constructor receives an election title, an array of candidate names, and a Unix timestamp for the deadline.

It rejects an empty title, an empty candidate list, more than 100 candidates, empty candidate names, or a deadline that has already passed. It stores the owner, title, and deadline, then adds each candidate.

Candidate IDs start at zero, so candidate 0 is the first candidate.

### Casting a vote

The `vote(candidateId)` function checks that the election is still open, the caller has not already voted, and the candidate ID exists. A successful vote updates that candidate's count and the total vote count, then emits a `VoteCast` event.

These checks happen in the contract itself. Disabling a button in the frontend helps the user, but it is not a security rule. Someone can call the contract without using this UI, so the contract must enforce the rules.

### Results and limits

Vote counts and transaction history are public. Wallet addresses do not prove real-world identity or eligibility, and one person can control multiple wallets. This is a learning project, not a private or secure election system.

## 2. Contract tests

`test/Voting.t.sol` uses Foundry to test the contract without a public network. Tests create a contract, call its functions, and check results or expected reverts.

Run these commands from the repository root:

~~~bash
forge build
forge test -vv
forge fmt --check
~~~

`forge build` checks compilation, `forge test` runs the tests, and `forge fmt --check` checks Solidity formatting without changing files.

## 3. Frontend configuration

Create `frontend/.env.local` from `frontend/.env.example` and set:

~~~dotenv
VITE_PRIVY_APP_ID=YOUR_PRIVY_APP_ID
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
VITE_ALCHEMY_POLICY_ID=YOUR_GAS_SPONSORSHIP_POLICY_ID
~~~

The RPC URL, chain ID, contract address, and sponsorship policy must refer to Sepolia. Sepolia's chain ID is 11155111.

Vite exposes variables beginning with `VITE_` to browser code. Treat these as public configuration. Never put a wallet private key or seed phrase in a frontend environment file. Restrict the Alchemy API key in the dashboard where possible.

## 4. Sign-in and embedded wallet

`main.tsx` wraps the app in `PrivyProvider`. The configuration enables email and Google login and asks Privy to create an embedded Ethereum wallet for each user who signs in. Users do not need MetaMask or another browser wallet extension.

`App.tsx` uses `usePrivy()` for login state and sign-out, and `useWallets()` to find the Privy-created embedded wallet. It converts that wallet into a Viem `LocalAccount` using `toViemAccount()`. That signer lets Alchemy Wallet APIs request signatures without exposing the private key to the app.

The frontend only uses the embedded wallet for votes; it does not silently fall back to an injected browser wallet. Sign-out ends the app's Privy session. It does not delete the embedded wallet.

## 5. Reading election data

`contract.ts` contains a small ABI, which is the list of contract functions the frontend needs. It creates an ethers `JsonRpcProvider` for read calls. `loadElection` in `App.tsx` reads the title, deadline, total vote count, candidate count, open/closed status, and whether the embedded wallet has voted. It then loads each candidate's name and vote count and saves the result in React state so the page updates.

Reads can work without signing in. The app needs a deployed contract address and a working RPC endpoint.

## 6. Sponsored vote flow

When the user selects Vote, the app checks that the user is authenticated, the embedded-wallet signer is ready, the configured chain is Sepolia, and sponsorship settings exist.

`sponsoredVoting.ts` then:

1. Creates an Alchemy Wallet APIs client using the Privy embedded-wallet signer.
2. Configures the Alchemy gas sponsorship policy.
3. ABI-encodes `vote(candidateId)` to match the Solidity function.
4. Sends the call to the deployed voting contract.
5. Waits for Alchemy's call status and treats the vote as successful only when the status is `success`.
6. Returns the transaction hash when the receipt includes one.

The policy must be active, linked to the same Alchemy app, and allow the deployed contract and `vote(uint256)` call. A policy can reject calls or hit its budget/limits, so configuration alone does not guarantee a gasless transaction.

## 7. Styling and page layout

`style.css` uses a small set of neutral colors, a system font stack, thin borders, simple buttons, and a single-column candidate list. It does not load an icon library or external fonts. There are no gradients or decorative animations. The media queries adapt the header, summary, and candidate rows for narrower screens.

## 8. Run the app

From the repository root:

~~~bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local, then run:
npm run dev
~~~

To check the production build:

~~~bash
npm run build
~~~

Keep the local environment file out of commits. If you change `.env.local`, restart Vite so it loads the new values.

## 9. Deployment safety

- Use a dedicated test account for Sepolia.
- Keep private keys and seed phrases out of chat, source files, and Git history.
- The frontend API key and policy ID are public configuration, not wallet secrets.
- Blockchain transactions and wallet addresses are public.
- Never use this demo to run a real election.
