"use client";

import dynamic from "next/dynamic";

// Render WalletMultiButton only on the client to avoid hydration mismatch
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then(mod => mod.WalletMultiButton),
  { ssr: false }
);

export default function Navbar() {
  return (
    <nav className="w-full px-8 py-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/40 backdrop-blur-md">
      <div className="text-lg font-semibold tracking-tight">Crowdfund</div>
      <WalletMultiButton className="!bg-zinc-900 dark:!bg-zinc-200 dark:!text-black !text-white" />
    </nav>
  );
}
