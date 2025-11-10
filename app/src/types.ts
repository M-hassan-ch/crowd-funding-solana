export interface Campaign {
  owner: string; // base58
  title: string;
  description: string;
  deadline: number;
  totalContribution: bigint;
  address: string;
  status: "active" | "expired";
}

export interface CampaignState {
  campaigns: string[];
  // campaigns: Campaign["address"];
}
