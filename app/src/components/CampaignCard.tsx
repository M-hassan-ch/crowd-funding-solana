"use client";

import Link from "next/link";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface CampaignCardProps {
  title: string;
  description: string;
  owner: string;
  deadline: number;
  address: string;
  totalContribution: bigint;
  status: "active" | "expired";
}

export default function CampaignCard({
  title,
  description,
  owner,
  deadline,
  address,
  totalContribution,
  status,
}: CampaignCardProps) {
  return (
    <Link href={`/campaigns/${address}`} className="block">
      <div className="p-4 rounded-md bg-gray-50 dark:bg-zinc-800 hover:shadow-lg transition cursor-pointer hover:scale-105 hover:bg-purple-950 hover:border hover:border-purple-400 min-h-36">
        <h2 className="font-semibold text-lg">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
          {description}
        </p>
        <p className="text-xs mt-1">
          Owner: {owner.slice(0, 8) + "..." + owner.slice(-8)}
        </p>
        <p className="text-xs mt-1">
          Contributions: {Number(totalContribution) / LAMPORTS_PER_SOL} SOL
        </p>
        <p className="text-xs mt-1">
          Deadline: {new Date(deadline * 1000).toLocaleString()}
        </p>
        <strong
          className={`py-1 rounded text-xs font-medium ${
            status === "active"
              ? "bg-green-600/15 text-green-500"
              : "bg-red-600/15 text-red-500"
          }`}
        >
          {status === "active" ? "Active" : "Expired"}
        </strong>
      </div>
    </Link>
  );
}
