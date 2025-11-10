"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCampaigns } from "@/context/CampaignContext";
import { PublicKey } from "@solana/web3.js";
import CampaignCard from "@/components/CampaignCard";

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {campaigns.map((c) => (
          <CampaignCard
            key={c.address}
            title={c.title}
            description={c.description}
            owner={c.owner}
            totalContribution={c.totalContribution}
            deadline={Number(c.deadline)}
            address={c.address}
            // onClick={() => console.log("View:", c.address)}
          />
        ))}
      </div>
    </main>
  );
}
