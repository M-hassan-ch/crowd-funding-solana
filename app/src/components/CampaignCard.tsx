"use client";

import Link from "next/link";

interface CampaignCardProps {
  title: string;
  description: string;
  owner: string;
  actualContributions?: bigint;
  deadline: number;
  address: string;
}

export default function CampaignCard({
  title,
  description,
  owner,
  actualContributions,
  deadline,
  address,
}: CampaignCardProps) {
  return (
    <Link href={`/campaigns/${address}`} className="block">
      <div className="p-4 rounded-md bg-gray-50 dark:bg-zinc-800 hover:shadow-lg transition cursor-pointer hover:scale-105 hover:bg-purple-950 hover:border hover:border-purple-400">
        <h2 className="font-semibold text-lg">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
          {description}
        </p>
        <p className="text-xs mt-1">
          Owner: {owner.slice(0, 8) + "..." + owner.slice(-8)}
        </p>
        {actualContributions !== undefined && (
          <p className="text-xs mt-1">Contributions: {actualContributions}</p>
        )}
        <p className="text-xs mt-1">
          Deadline: {new Date(deadline * 1000).toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
