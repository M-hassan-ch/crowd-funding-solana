"use client";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { createSolanaClient } from "gill";
import { SolanaProvider } from "@gillsdk/react";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import Navbar from "@/components/Navbar";

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
        <Navbar />
          <main className="pt-4">
            <Component {...pageProps} />
          </main>
        </WalletModalProvider>
      </WalletProvider>
    </SolanaProvider>
  );
}
