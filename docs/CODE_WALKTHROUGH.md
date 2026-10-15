# Code walkthrough

This guide explains how the voting app works from the Solidity contract to the browser. The code comments explain why each step exists, in plain language.

## How the pieces fit together

1. Voting.sol stores the election title, candidate list, deadline, and vote counts.
2. Foundry compiles and tests the contract. A deployment command puts a copy of it on a blockchain.
3. frontend/src/contract.ts tells the frontend which contract functions exist and how to connect to the network.
4. frontend/src/App.tsx loads the election, connects MetaMask, checks the network, and handles the vote button.
5. MetaMask asks the user to approve a transaction. The contract checks the vote and updates its state.
6. The frontend reads the updated totals after the transaction is confirmed.

## Repository map

| File | What it does |
| --- | --- |
| src/Voting.sol | The rules for an election and the data stored on-chain. |
| test/Voting.t.sol | Tests for valid votes and cases the contract should reject. |
| script/DeployVoting.s.sol | Foundry deployment script and example election setup. |
| foundry.toml | Foundry compiler, test, and project settings. |
| .github/workflows/ci.yml | Runs formatting, compilation, contract tests, and frontend build on GitHub. |
| frontend/src/App.tsx | Page layout and wallet, election, and transaction state. |
| frontend/src/contract.ts | Contract ABI, environment values, provider creation, and error formatting. |
| frontend/src/sponsoredVoting.ts | Optional Alchemy Wallet APIs flow for sponsored voting on Sepolia. |
| frontend/src/style.css | Page layout, colors, type, responsive rules, and focus styles. |
| frontend/.env.example | Safe template for local frontend configuration. |

## 1. The smart contract

src/Voting.sol is the source of truth for the election.

### Constructor

When the contract is deployed, the constructor receives an election title, an array of candidate names, and a Unix timestamp for the deadline.

It rejects an empty title, an empty candidate list, more than 100 candidates, empty candidate names, or a deadline that has already passed. It stores the owner, title, and deadline, then adds each candidate.

Candidate IDs start at zero, so candidate 0 is the first candidate.

### Casting a vote

The vote(candidateId) function checks that the election is still open, the caller has not already voted, and the candidate ID exists. A successful vote updates that candidate's count and the total vote count, then emits a VoteCast event.

These checks happen in the contract itself. Disabling a button in the frontend helps the user, but it is not a security rule. Someone can call the contract without using this UI, so the contract must enforce the rules.

### Results and limits

Vote counts and transaction history are public. Wallet addresses do not prove real-world identity or eligibility, and one person can control multiple wallets. This is a learning project, not a private or secure election system.

## 2. Contract tests

test/Voting.t.sol uses Foundry to test the contract without a public network. Tests create a contract, call its functions, and check results or expected reverts.

Run these commands from the repository root:

~~~bash
forge build
forge test -vv
forge fmt --check
~~~

forge build checks compilation, forge test runs the tests, and forge fmt --check checks Solidity formatting without changing files.

## 3. Frontend configuration

Create frontend/.env.local from frontend/.env.example and set these values:

~~~dotenv
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# Optional, only when an active Sepolia sponsorship policy is set up
VITE_ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
VITE_ALCHEMY_POLICY_ID=YOUR_GAS_SPONSORSHIP_POLICY_ID
~~~

The RPC URL and contract address must refer to the same network. Sepolia's chain ID is 11155111. Local Anvil normally uses 31337.

Vite exposes variables beginning with VITE_ to browser code. Treat these values as public. Never put a wallet private key or seed phrase in a frontend environment file. Restrict the Alchemy key in the dashboard where possible.

## 4. How the frontend reads the contract

contract.ts contains a small ABI, which is the list of contract functions the frontend needs. It creates an ethers JSON-RPC provider for read calls and a browser provider for MetaMask. getVotingContract combines the configured address, ABI, and provider into an object that can call the contract.

loadElection in App.tsx reads the title, deadline, total vote count, candidate count, open/closed status, and whether the connected wallet has voted. It then loads each candidate's name and vote count and saves the result in React state so the page updates.

## 5. How wallet connection works

When the user clicks Connect wallet, the app asks MetaMask for permission to see the active account. It also reads the chain ID. The app only enables voting when the wallet network matches VITE_CHAIN_ID.

MetaMask emits account and network change events. The page listens for those events so it can update if the user switches account or network while the page is open.

The app never requests a private key. MetaMask keeps the key and asks the user to approve transactions.

## 6. What happens when Vote is clicked

The app checks that a wallet is connected, that it is on the configured network, and that the election appears open. It then follows one of two paths.

### Normal MetaMask transaction

If sponsorship is not configured, the frontend gets a MetaMask signer, calls vote(candidateId) on the contract, and waits for the transaction receipt. The wallet pays the gas fee.

### Optional Alchemy gas sponsorship

If both VITE_ALCHEMY_API_KEY and VITE_ALCHEMY_POLICY_ID are present, sponsoredVoting.ts sends the encoded vote call through Alchemy Wallet APIs and requests sponsorship using that policy ID. The policy must be active, configured for Sepolia, and allow the call. A configured policy does not guarantee that every transaction will be sponsored. Review every MetaMask prompt.

After either path confirms, the app reloads the election totals. If a transaction fails or is rejected, the page displays an error message.

## 7. Styling and page layout

style.css uses a small set of neutral colors, a system font stack, thin borders, simple buttons, and a single-column candidate list. It does not load an icon library or external fonts. There are no gradients or decorative animations. The media queries adapt the header, summary, and candidate rows for narrower screens.

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

Keep the local environment file out of commits. If you change .env.local, restart Vite so it loads the new values.

## 9. Deployment safety

- Use a dedicated test wallet for Sepolia.
- Keep private keys and seed phrases out of chat, source files, and Git history.
- Deployment requires test ETH unless you use a local chain such as Anvil.
- The frontend RPC key and sponsorship policy ID are public browser configuration, not private credentials.
- Never use this demo to run a real election.
