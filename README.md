# Blockchain Voting Application

A small educational smart-contract project demonstrating on-chain election setup, one-wallet-one-vote enforcement, public vote totals, and automated testing with Foundry.

> **Important:** This is a learning project, not a secure or private voting system for real elections. It does not verify voter identity or eligibility, prevent one person from using multiple wallets, hide ballots, or resist coercion. It has not been professionally tested.

## Features

- Deploy an election with a title, fixed candidate list, and deadline.
- Allow each address to vote at most once.
- Reject votes for unknown candidates and votes submitted at or after the deadline.
- Track each candidate's votes and the total number of votes.
- Emit events when candidates are added and votes are cast.
- Use Solidity custom errors for explicit failure cases.
- Test expected behavior and invalid inputs with Foundry.
- Run formatting, compilation, and tests in GitHub Actions.

## Tech stack

- Solidity `^0.8.24`
- Foundry: `forge`, `cast`, and `anvil`
- GitHub Actions for continuous integration
- React + TypeScript frontend with Privy embedded-wallet sign-in
- Alchemy-compatible RPC configuration for blockchain reads
- GitHub Actions for Solidity checks and frontend build

The frontend supports email and Google sign-in through Privy embedded wallets, candidate/result display, and sponsored voting on Sepolia through Alchemy Wallet APIs. Gas coverage depends on the active sponsorship policy.

## Frontend: Privy and Alchemy

For the full code walkthrough, see [`docs/CODE_WALKTHROUGH.md`](docs/CODE_WALKTHROUGH.md). The demo's [privacy notice](docs/PRIVACY.md) and [terms of use](docs/TERMS.md) explain its scope and limitations.

See [`frontend/README.md`](frontend/README.md) for setup instructions. Privy handles email/Google sign-in and embedded-wallet key custody, while Alchemy Wallet APIs submits vote calls and requests policy-based gas sponsorship. Configure `VITE_PRIVY_APP_ID`, a deployed Sepolia contract address, and an active Alchemy sponsorship policy before testing a vote.

From the repository root:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The Privy app ID, Alchemy RPC key, and sponsorship policy ID are visible browser configuration. Restrict the Alchemy key in the dashboard; never put a wallet private key or seed phrase in frontend environment variables.

## Requirements

- macOS, Linux, or Windows with a supported Foundry setup
- [Foundry](https://book.getfoundry.sh/getting-started/installation)

Verify your installation:

```bash
forge --version
anvil --version
cast --version
```

## Install and test

Clone the repository, enter its directory, and install the Foundry test library:

```bash
git clone https://github.com/henryrio08/blockchain-voting-app.git
cd blockchain-voting-app
forge install foundry-rs/forge-std
forge build
forge test -vv
forge fmt --check
```

If you have already cloned the repository, skip the `git clone` and `cd` commands. The `forge-std` dependency is ignored by Git in this project, so install it locally before running tests.

## Run a local blockchain

In terminal 1:

```bash
anvil
```

Keep Anvil running. It creates local development accounts with test ETH and listens on `http://127.0.0.1:8545` by default.

In terminal 2, from the repository directory, create a local environment file:

```bash
cp .env.example .env
```

Put the RPC URL and a **local Anvil test private key** in `.env`:

```bash
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=PASTE_ANVIL_TEST_PRIVATE_KEY_HERE
```

Load the environment variables into the current terminal:

```bash
set -a
source .env
set +a
```

Deploy the contract:

```bash
forge script script/DeployVoting.s.sol:DeployVoting \
  --rpc-url "$RPC_URL" \
  --broadcast
```

The script deploys an election called `Demo Election` with three example candidates and a deadline seven days after deployment. Save the contract address printed in the output.

**Never commit `.env`, paste private keys into chat, or use a real wallet's private key for this exercise.** Anvil's default private keys are publicly known and must only be used with the local test chain.

## Interact with the deployed contract

Replace `YOUR_CONTRACT_ADDRESS` with the address printed by the deployment script:

```bash
cast call YOUR_CONTRACT_ADDRESS "title()(string)" --rpc-url "$RPC_URL"
cast call YOUR_CONTRACT_ADDRESS "candidateCount()(uint256)" --rpc-url "$RPC_URL"
cast call YOUR_CONTRACT_ADDRESS "totalVotes()(uint256)" --rpc-url "$RPC_URL"
```

These are read-only calls; they do not submit transactions or change contract state.

## Contract behavior

- The constructor validates the title, candidate list, candidate names, maximum of 100 candidates, and future deadline.
- Candidate IDs are zero-based: the first candidate is ID `0`.
- `vote(candidateId)` checks the deadline, whether the caller already voted, and whether the candidate ID exists before updating state.
- `hasVoted(address)` records whether an address has voted in this election.
- `totalVotes` tracks the total successful votes and should equal the sum of candidate vote counts.
- `results()` returns live, publicly visible results.
- `finalize()` returns results only after the deadline. It is a read-only function and **does not write a permanent finalized flag**.
- Transactions are atomic: if a call reverts, its state changes are rolled back.

Block timestamps are controlled by the chain and should not be treated as a precision clock.

## Project layout

```text
src/Voting.sol                 Smart contract
test/Voting.t.sol              Foundry unit tests
script/DeployVoting.s.sol      Deployment script
foundry.toml                   Foundry configuration
.env.example                   Environment variable template
.github/workflows/ci.yml       Automated build, test, and format check
```

## Continuous integration

On pushes and pull requests targeting `main`, GitHub Actions installs Foundry and `forge-std`, then runs:

```bash
forge fmt --check
forge build
forge test -vv
```

A green workflow means those checks passed in CI for that revision. Always inspect the workflow result rather than assuming a commit was tested successfully.

## Limitations and security considerations

- **No ballot secrecy:** transactions and vote totals are publicly observable.
- **No voter eligibility:** a wallet address is not proof of an eligible person.
- **No coercion resistance:** voters can reveal how they voted.
- **Fixed candidates and deadline:** they are selected at deployment.
- **No professional audit:** the code is educational and must not be used for real elections.

## License

MIT
