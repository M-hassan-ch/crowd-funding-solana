"use client";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { createSolanaClient } from "gill";
import { SolanaProvider } from "@gillsdk/react";
import { WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import Navbar from "@/components/Navbar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CampaignProvider } from "@/context/CampaignContext";

import "@solana/wallet-adapter-react-ui/styles.css";

const client = createSolanaClient({
  urlOrMoniker: "devnet",
});

const wallets = [new PhantomWalletAdapter()];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async () => {
        throw new Error(
          "No default queryFn provided. Provide queryFn when using gill-client queries."
        );
      },
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SolanaProvider client={client}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <QueryClientProvider client={queryClient}>
            <Navbar />
            <CampaignProvider>
              <main className="pt-4">
                <Component {...pageProps} />
              </main>
            </CampaignProvider>
          </QueryClientProvider>
        </WalletModalProvider>
      </WalletProvider>
    </SolanaProvider>
  );
}
