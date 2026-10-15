# Privacy notice

Last updated: October 15, 2026

This is an educational, open-source blockchain voting demo.

## Information this app uses

- If you connect MetaMask, the app can read the active public wallet address from the wallet provider.
- The app reads election details and vote counts from the blockchain through the RPC endpoint configured by the operator.
- If you vote, the transaction and wallet address are public on the selected blockchain.
- The app does not send profile information to a project-owned backend or maintain a project-owned user database.

## Third-party services

MetaMask handles wallet access and transaction approval. The configured RPC provider, such as Alchemy, receives blockchain requests. Those providers may process request metadata under their own policies. Review their privacy documentation before using the app.

## Keys and local settings

Frontend environment variables beginning with VITE_ are included in the browser build. The RPC API key and sponsorship policy ID are public client configuration, not secrets. Never place a wallet private key or seed phrase in the frontend environment file.

## Contact and scope

This is a student learning project and does not provide account registration, analytics, or a project-owned API. This notice describes the current demo behavior and is not legal advice.
