"use client"; // Required when using React Server Components

import { useAccount } from "@gillsdk/react";
import { useSolanaClient } from "@gillsdk/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { fetchAllCampaign, getCampaignStateDecoder } from "@/generated";
import { CONNECTION, GLOBAL_CAMPAIGN_STATE_ADDRESS } from "@/constants";
import { getActualContributions } from "@/utils";

export default function GetAllCampaign() {
    const { publicKey, signTransaction, connect } = useWallet();
    const { rpc } = useSolanaClient();
    const { account: campaignState, isLoading: isCampaignStateLoading,  } = useAccount({
        address: GLOBAL_CAMPAIGN_STATE_ADDRESS.toBase58(),
        decoder: getCampaignStateDecoder(),
    });

    const fetchExistingCampaign = async () => {
        try {
            if (!publicKey) {
                window.alert("No wallet connected");
                return;
            }
            if (!isCampaignStateLoading && campaignState){
                const existingCampaigns = await fetchAllCampaign(rpc, campaignState.data.campaigns);
                const parsedCampaigns = await Promise.all(
                    existingCampaigns.map(async (campaign) => {
                        const actualContributions = await getActualContributions(campaign, CONNECTION);
                        return {
                            owner: campaign.data.owner,
                            title: campaign.data.title,
                            description: campaign.data.description,
                            deadline: campaign.data.deadline,
                            address: campaign.address,
                            actualContributions: actualContributions,
                        }
                    })
                );
                console.log("Campaigns account:", parsedCampaigns);
                return parsedCampaigns;
            } else {
                throw new Error("Campaign state is loading or not found");
            }
        } catch (error) {
            window.alert("Error while fetching campaign state");
            console.log(error);
        } 
    }

    return (
        <div>
            <button onClick={fetchExistingCampaign}>Fetch Existing Campaign</button>
        </div>
    );
}
