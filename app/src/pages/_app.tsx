"use client";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { createSolanaClient } from "gill";
import { SolanaProvider } from "@gillsdk/react";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import "@solana/wallet-adapter-react-ui/styles.css"; // required for modal styles

const client = createSolanaClient({
  urlOrMoniker: "devnet",
});

const wallets = [new PhantomWalletAdapter()];

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SolanaProvider client={client}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </SolanaProvider>
  );
}
