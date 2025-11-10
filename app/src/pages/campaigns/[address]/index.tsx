"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSolanaClient } from "@gillsdk/react";
import { fetchAllMaybeCampaign } from "@/generated/accounts/campaign";
import { CONNECTION } from "@/constants";
import { getActualContributions } from "@/utils";
import { useCampaigns } from "@/context/CampaignContext";
import { Campaign } from "@/types";
import { Address, address as addressBrand } from "gill";
import Contribute from "@/components/Contribute";
import Withdraw from "@/components/Withdraw";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export default function CampaignDetailsPage() {
  const params = useParams();
  const { rpc } = useSolanaClient();
  const { campaigns } = useCampaigns();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  // 2. Normalize params
  const address = Array.isArray(params?.address)
    ? params.address[0]
    : params?.address;

  useEffect(() => {
    if (!address) return;

    const fetchCampaign = async () => {
      setLoading(true);

      // 1️⃣ Try to find campaign in context state
      let found = campaigns.find((c) => c.address === address);

      // 2️⃣ Try to find campaign in localStorage (fallback)
      if (!found) {
        const stored = localStorage.getItem("campaigns");
        if (stored) {
          const parsed: Campaign[] = JSON.parse(stored);
          found = parsed.find((c) => c.address === address);
        }
      }

      // 3️⃣ If still not found, fetch from chain
      if (!found) {
        try {
          // normalize address if it comes from string | string[]
          const addrStr = Array.isArray(address) ? address[0] : address;
          const addr: Address = addressBrand(addrStr);

          const maybeAccounts = await fetchAllMaybeCampaign(rpc, [addr]);
          const c = maybeAccounts[0];
          if (!c.exists) {
            alert("Campaign not found on-chain");
            setCampaign(null);
            return;
          }
          const contributions = await getActualContributions(c, CONNECTION);
          found = {
            owner: c.data.owner,
            title: c.data.title,
            description: c.data.description,
            deadline: Number(c.data.deadline),
            totalContribution: BigInt(c.data.totalContribution + contributions),
            address: c.address,
            status:
              // todo: extract to util
              Number(c.data.deadline) > Math.floor(Date.now() / 1000)
                ? "active"
                : "expired",
          };
        } catch (err) {
          console.error(err);
          setCampaign(null);
          return;
        }
      }

      console.log({ found });
      setCampaign(found || null);
      setLoading(false);
    };

    fetchCampaign();
  }, [address, campaigns, rpc]);

  if (loading) return <p>Loading campaign...</p>;
  if (!campaign) return <p>Campaign not found</p>;

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white dark:bg-zinc-900 rounded-md shadow-md space-y-4">
      <h1 className="text-2xl font-bold">{campaign.title}</h1>
      <p className="text-gray-600 dark:text-gray-300">{campaign.description}</p>
      <p className="text-xs mt-1">Owner: {campaign.owner}</p>
      <p className="text-xs mt-1">
        Deadline: {new Date(campaign.deadline * 1000).toLocaleString()}
      </p>
      <p className="text-xs mt-1">
        Total Contribution:{" "}
        {Number(campaign.totalContribution) / LAMPORTS_PER_SOL} SOL
      </p>
      <strong
        className={`py-1 rounded text-xs font-medium ${
          campaign.status === "active"
            ? "bg-green-600/15 text-green-500"
            : "bg-red-600/15 text-red-500"
        }`}
      >
        {campaign.status === "active" ? "Active" : "Expired"}
      </strong>

      <div className="flex gap-4 mt-4">
        <Contribute campaignAddress={addressBrand(campaign.address)} />
        <Withdraw campaignAddress={addressBrand(campaign.address)} />
      </div>
    </main>
  );
}
