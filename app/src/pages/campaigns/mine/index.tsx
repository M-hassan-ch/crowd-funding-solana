"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCampaigns } from "@/context/CampaignContext";
import { PublicKey } from "@solana/web3.js";

export default function MyCampaigns() {
  const { publicKey } = useWallet();
  const { campaigns } = useCampaigns();

  if (!publicKey) return <p>Connect a wallet first.</p>;

  const myCampaigns = campaigns.filter(
    (c) => new PublicKey(c.owner).toBase58() === publicKey.toBase58()
  );

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Campaigns</h1>

      {myCampaigns.length === 0 && (
        <p>You have not created any campaigns yet.</p>
      )}

      {myCampaigns.map((c) => (
        <div key={c.address} className="p-4 border rounded-md mb-3">
          <h2 className="font-semibold">{c.title}</h2>
          <p>{c.description}</p>
        </div>
      ))}
    </main>
  );
}
