"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaClient, useAccount } from "@gillsdk/react";
import { getCampaignStateDecoder } from "@/generated";
import { CONNECTION, GLOBAL_CAMPAIGN_STATE_ADDRESS } from "@/constants";
import { getActualContributions } from "@/utils";
import { fetchAllMaybeCampaign } from "@/generated/accounts/campaign";
import { Campaign } from "@/types";
import { PublicKey } from "@solana/web3.js";
import { useCampaigns } from "@/context/CampaignContext";

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
            const actualContributions = await getActualContributions(
              campaign,
              CONNECTION
            );
            return {
              owner: new PublicKey(campaign.data.owner).toBase58(),
              title: campaign.data.title,
              description: campaign.data.description,
              deadline: Number(campaign.data.deadline),
              total_contribution: BigInt(campaign.data.totalContribution),
              address: new PublicKey(campaign.address).toBase58(),
              actualContributions,
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

  const handleRefresh = async () => {
    setLoading(true);
    await fetchCampaigns();
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start py-16 px-6 bg-white dark:bg-black mx-auto">
      <h1 className="text-2xl font-bold mb-4">All Campaigns</h1>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 mb-4 cursor-pointer"
      >
        {loading ? "Refreshing..." : "Refresh"}
      </button>

      {loading && <p>Loading campaigns...</p>}
      {!loading && campaigns.length === 0 && <p>No campaigns found</p>}

      <div className="grid gap-4 w-full">
        {campaigns.map((c) => (
          <div
            key={c.address}
            className="p-4 border rounded-md bg-gray-50 dark:bg-zinc-800"
          >
            <h2 className="font-semibold text-lg">{c.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {c.description}
            </p>
            <p className="text-xs mt-1">
              Owner: {new PublicKey(c.owner).toBase58()}
            </p>
            <p className="text-xs mt-1">
              Contributions: {c.actualContributions}
            </p>
            <p className="text-xs mt-1">
              Deadline: {new Date(Number(c.deadline) * 1000).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
