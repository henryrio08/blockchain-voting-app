# Code walkthrough

This is a guide to how I put the voting app together. I find it easiest to think of it as two parts: the contract, which enforces the rules, and the frontend, which lets someone use it.

## How a vote gets counted

1. The contract stores the election title, candidates, deadline, and vote counts.
2. Foundry compiles and tests the contract. The deployment script can put it on a local chain or Sepolia.
3. The frontend reads the contract using its address and ABI.
4. The user connects MetaMask and chooses a candidate.
5. MetaMask asks the user to approve the transaction.
6. The contract checks the vote and updates the totals if everything is valid.
7. The frontend reloads the election data after the transaction succeeds.

The important part is that the contract checks the rules itself. The website can disable a button or show an error, but someone could call the contract without using the website.

## Files worth knowing

| File | What it does |
| --- | --- |
| `src/Voting.sol` | Stores the election and checks votes. |
| `test/Voting.t.sol` | Tests normal votes and cases that should fail. |
| `script/DeployVoting.s.sol` | Deploys an example election. |
| `foundry.toml` | Foundry project settings. |
| `.github/workflows/ci.yml` | Runs the checks on GitHub. |
| `frontend/src/App.tsx` | The page, wallet connection, and vote flow. |
| `frontend/src/contract.ts` | ABI, environment settings, and contract connection. |
| `frontend/src/sponsoredVoting.ts` | Optional Alchemy-sponsored vote flow. |
| `frontend/src/style.css` | Page layout and styling. |

## The contract

The source is `src/Voting.sol`.

When the contract is deployed, its constructor gets an election title, candidate names, and a deadline. It checks that the title and candidate list aren't empty, that candidate names are valid, that there aren't more than 100 candidates, and that the deadline is in the future.

Candidate IDs start at `0`, so the first candidate is ID 0.

When `vote(candidateId)` is called, the contract checks that the deadline hasn't passed, the wallet hasn't voted already, and the candidate ID exists. If all checks pass, it increments that candidate's votes and the total vote count, then emits an event.

The vote limit is per wallet address, not per person. The contract can't tell whether one person controls several wallets.

## Tests

The tests in `test/Voting.t.sol` use Foundry, so you can run them without deploying to a public network. From the repo root:

```bash
forge build
forge test -vv
forge fmt --check
```

`forge build` compiles the contract, `forge test` runs the tests, and `forge fmt --check` checks formatting without changing files.

## How the frontend connects

The frontend uses the ABI to know which contract functions it can call. The contract address tells it where the deployed election lives. The RPC URL is how it reads blockchain data.

`loadElection` in `frontend/src/App.tsx` reads the title, deadline, vote count, candidate names and totals, and whether the connected wallet has voted. React state holds that data so the page can update when it changes.

When the user connects MetaMask, the app asks for permission to see the active public address. It checks the chain ID too, because the same contract address won't necessarily point to the same thing on different networks. The app listens for account and network changes while it is open.

MetaMask keeps the private key. This app doesn't ask for it.

## What happens when Vote is clicked

The app checks the connected wallet and network before submitting the vote. There are two possible transaction paths.

### Regular transaction

If sponsorship isn't configured, the app sends `vote(candidateId)` through MetaMask. The wallet pays the network fee.

### Alchemy gas sponsorship

If both `VITE_ALCHEMY_API_KEY` and `VITE_ALCHEMY_POLICY_ID` are configured, `frontend/src/sponsoredVoting.ts` uses Alchemy Wallet APIs to submit the encoded vote call with a request for sponsorship. It checks the Sepolia network and verifies the active account and chain before sending.

Alchemy's policy decides whether to cover the fee. The policy needs to be active, have budget available, and allow the contract call. The first use may also show an EIP-7702 authorization prompt in MetaMask. Review that prompt before approving it.

After the transaction finishes, the frontend reloads the election data. If the wallet rejects the request or the transaction fails, the app shows an error instead.

## Environment settings

Create `frontend/.env.local` from `frontend/.env.example`. For Sepolia, the values look like this:

```dotenv
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_ALCHEMY_API_KEY=YOUR_ALCHEMY_API_KEY
VITE_ALCHEMY_POLICY_ID=YOUR_SEPOLIA_POLICY_ID
```

For local Anvil, the usual chain ID is `31337` and the RPC URL is `http://127.0.0.1:8545`.

Anything starting with `VITE_` is included in the browser build. These are public settings, not a safe place for a private key or seed phrase. Restrict the Alchemy key in its dashboard where possible.

## A few limitations

- Votes and wallet addresses are public.
- There is no identity or eligibility check.
- The candidate list and deadline are fixed at deployment.
- Sponsorship can fail or run out of budget.
- The contract hasn't been professionally audited and isn't for real elections.

## Run the frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local, then start the app:
npm run dev
```

To check the frontend build, run `npm run build` from the `frontend` directory. Keep `.env.local` out of Git and restart Vite after changing it.
