"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaClient, useAccount } from "@gillsdk/react";
import { getCampaignStateDecoder } from "@/generated";
import { GLOBAL_CAMPAIGN_STATE_ADDRESS } from "@/constants";
import { fetchAllMaybeCampaign } from "@/generated/accounts/campaign";
import { Campaign } from "@/types";
import { PublicKey } from "@solana/web3.js";
import { useCampaigns } from "@/context/CampaignContext";
import CampaignCard from "@/components/CampaignCard";

export default function Home() {
  const { publicKey } = useWallet();
  const { rpc } = useSolanaClient();
  const { account: campaignState, isLoading: isCampaignStateLoading } =
    useAccount({
      address: GLOBAL_CAMPAIGN_STATE_ADDRESS.toBase58(),
      decoder: getCampaignStateDecoder(),
    });

  const { campaigns, setCampaigns } = useCampaigns();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // load on first visit only if empty (to avoid double-fetch on SSR)
    if (campaigns.length === 0) fetchCampaigns();
  }, [publicKey, campaignState, isCampaignStateLoading, rpc]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const updatedCampaigns = localStorage.getItem("updated");
      if (updatedCampaigns) {
        fetchCampaigns();
        localStorage.removeItem("updated");
      }
    }
  }, [typeof window]);

  const fetchCampaigns = async () => {
    if (!publicKey) return;
    if (!isCampaignStateLoading && campaignState) {
      try {
        setLoading(true);

        const maybeAccounts = await fetchAllMaybeCampaign(
          rpc,
          campaignState.data.campaigns
        );

        const existingCampaigns = maybeAccounts.filter(
          (acc): acc is typeof acc & { exists: true } => acc.exists
        );

        const parsedCampaigns: Campaign[] = await Promise.all(
          existingCampaigns.map(async (campaign) => {
            return {
              owner: new PublicKey(campaign.data.owner).toBase58(),
              title: campaign.data.title,
              description: campaign.data.description,
              deadline: Number(campaign.data.deadline),
              totalContribution: BigInt(campaign.data.totalContribution),
              address: new PublicKey(campaign.address).toBase58(),
              status:
                Number(campaign.data.deadline) > Date.now() / 1000
                  ? "active"
                  : "expired",
            };
          })
        );

        setCampaigns(parsedCampaigns);
      } catch (err) {
        console.error("Error fetching campaigns:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start py-16 px-6 bg-white dark:bg-black mx-auto">
      <h1 className="text-2xl font-bold mb-4">All Campaigns</h1>

      {loading && <p>Loading campaigns...</p>}
      {!loading && campaigns.length === 0 && <p>No campaigns found</p>}

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
            status={
              c.deadline > Math.floor(Date.now() / 1000) ? "active" : "expired"
            }
          />
        ))}
      </div>
    </main>
  );
}
