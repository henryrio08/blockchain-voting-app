# Privacy notice

Last updated: October 15, 2026

This is an educational, open-source blockchain voting demo.

## Information this app uses

- If you sign in with email or Google, Privy processes authentication information and manages the embedded wallet according to your Privy account and its privacy policies.
- The app reads the embedded wallet's public address so it can check whether that address has voted.
- The app reads election details and vote counts from the blockchain through the RPC endpoint configured by the operator.
- If you vote, the transaction and wallet address are public on the selected blockchain.
- The app does not send profile information to a project-owned backend or maintain a project-owned user database.

## Third-party services

Privy handles authentication and embedded-wallet key custody. Alchemy receives blockchain RPC and Wallet APIs requests, and its gas sponsorship service evaluates transactions against the configured policy. These providers may process request metadata under their own policies. Review their privacy documentation before using the app.

## Keys and local settings

Frontend environment variables beginning with VITE_ are included in the browser build. The Privy app ID, Alchemy RPC API key, and sponsorship policy ID are public client configuration, not wallet secrets. Never place a wallet private key or seed phrase in the frontend environment file.

## Contact and scope

This is a student learning project and does not maintain a project-owned user database or API. This notice describes the current demo behavior and is not legal advice.
