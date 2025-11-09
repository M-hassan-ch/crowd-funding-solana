"use client";
// import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { createSolanaClient } from "gill";
import { SolanaProvider } from "@gillsdk/react";
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";

const client = createSolanaClient({
  urlOrMoniker: "devnet",
});


const wallets = [new PhantomWalletAdapter()];

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SolanaProvider client={client}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <Component {...pageProps} />
      </WalletProvider>
    </SolanaProvider>
  );
}
