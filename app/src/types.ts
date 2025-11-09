export interface Campaign {
  owner: string; // base58
  title: string;
  description: string;
  deadline: number;
  total_contribution: bigint;
  address: string;
  actualContributions?: bigint;
}

export interface CampaignState {
  campaigns: string[];
  // campaigns: Campaign["address"];
}
