import React from "react";
import ReactDOM from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import App from "./App";
import "./style.css";

const privyAppId = (import.meta.env.VITE_PRIVY_APP_ID || "").trim();
const root = ReactDOM.createRoot(document.getElementById("root")!);

if (!privyAppId) {
  root.render(
    <main className="page">
      <header className="site-header">
        <a className="wordmark" href="#top">Voting demo</a>
      </header>
      <section className="intro" id="top">
        <p className="eyebrow">BLOCKCHAIN VOTING APPLICATION</p>
        <h1>Finish wallet setup</h1>
        <p className="intro-copy">
          Add your Privy application ID to frontend/.env.local before starting the app.
          This enables email or Google sign-in and creates an embedded wallet for each user.
        </p>
        <p><a href="https://dashboard.privy.io/">Open the Privy dashboard</a></p>
      </section>
    </main>,
  );
} else {
  root.render(
    <React.StrictMode>
      <PrivyProvider
        appId={privyAppId}
        config={{
          loginMethods: ["email", "google"],
          embeddedWallets: {
            ethereum: { createOnLogin: "all-users" },
          },
          appearance: {
            theme: "light",
            accentColor: "#315748",
          },
        }}
      >
        <App />
      </PrivyProvider>
    </React.StrictMode>,
  );
}
