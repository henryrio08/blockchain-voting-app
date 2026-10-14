# Blockchain Voting Application


A decentralized voting system built with Solidity and Foundry. It demonstrates on-chain election setup, one-wallet-one-vote enforcement, transparent vote totals, and tests for important contract invariants.


## Features


- Owner creates an election with a title and a fixed list of candidates.
- Voting opens at deployment and closes at a configurable timestamp.
- Each address can vote at most once per election.
- Candidate vote totals and election state are publicly queryable.
- Solidity custom errors make common failure cases explicit.
- Foundry tests cover successful voting and expected reverts.
- A deployment script targets a local Anvil chain or a configured testnet RPC.


## Stack


- Solidity `^0.8.24`
- Foundry (`forge`, `cast`, `anvil`)
- MetaMask for wallet interaction
- Alchemy RPC endpoint as an optional hosted RPC provider

## Quick start

Install Foundry: https://book.getfoundry.sh/getting-started/installation

```bash
forge install
forge test -vv
```
Start a local chain in another terminal:

```bash
anvil
```

Deploy locally in a new terminal:


```bash
forge script script/DeployVoting.s.sol:DeployVoting \
 --rpc-url http://127.0.0.1:8545 \
 --broadcast
```

Anvil prints funded development accounts and private keys. Import a **local Anvil-only** account into MetaMask if you want to interact manually. Never use a real wallet's private key in a project, script, `.env`, or GitHub.


## Testnet deployment (optional)


1. Create an Alchemy app for the test network you intend to use.
2. Copy its RPC URL into a local `.env` file (never commit `.env`).
3. Add the deployer's private key to `.env` only for a disposable test wallet.
4. Ensure `.gitignore` excludes `.env` and `broadcast/`.
5. Run the deploy script using the selected network's RPC URL and `--broadcast`.


Example environment variable names:


```bash
RPC_URL=https://...
PRIVATE_KEY=...
```


Do not paste keys into chat or commit them. Use a test wallet with no valuable assets.


## Contract behavior


`Voting` stores the election title, owner, deadline, candidates, candidate vote counts, and whether an address has voted. `vote(candidateId)` validates that the election is open, the candidate exists, and the caller has not voted before. It then marks the caller as having voted and increments that candidate's count. Since a transaction is atomic, a revert rolls back state changes.


The deadline is a timestamp and is enforced by the contract, not by the front end. Block timestamps are consensus inputs and should not be treated as a precision clock.


## Project layout


```text
src/Voting.sol                 Main smart contract
test/Voting.t.sol              Foundry unit tests
script/DeployVoting.s.sol      Deployment script
foundry.toml                   Foundry configuration
.env.example                   Environment variable template
.gitignore                     Ignore secrets/build output
```


## Commands


```bash
forge build       # compile
forge test -vv    # run tests with traces
forge fmt --check # check formatting
forge fmt         # format Solidity files
```


## Limitations and security considerations


- **No ballot secrecy:** all transactions and state are publicly observable.
- **No voter eligibility:** a wallet is not proof of a unique eligible person.
- **Sybil resistance is absent:** one person can control multiple wallets.
- **No coercion resistance:** voters can prove their public transaction.
- **Admin trust:** the owner chooses candidates and deadline at deployment.
- **No audit:** this is educational code and has not been professionally audited.
- **No frontend included yet:** MetaMask UI and Alchemy Account Kit sponsorship are sensible next steps after contract tests pass.


## License


MIT




