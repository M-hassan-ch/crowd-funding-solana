import { PROGRAM_ID } from "@/constants";
import { Connection, PublicKey } from "@solana/web3.js";

export function deriveCampaignPDA(userKey: PublicKey, title: string): PublicKey {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("campaign"), userKey.toBuffer(), Buffer.from(title)],
        PROGRAM_ID
    )[0];
}

export function deriveGlobalCampaignStatePDA(): PublicKey {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("campaign_state")],
        PROGRAM_ID
    )[0];
}

function calculateCampaignAccountSize(): number {
    const discriminatorSize = 8;
    const ownerSize = 32;
    const titleLengthPrefix = 4;
    const titleMaxSize = 200;
    const descriptionLengthPrefix = 4;
    const descriptionMaxSize = 1000;
    const deadlineSize = 8;
    const totalContributionSize = 8;
    
    return discriminatorSize + ownerSize + titleLengthPrefix + titleMaxSize + 
           descriptionLengthPrefix + descriptionMaxSize + deadlineSize + totalContributionSize;
}

export async function getActualContributions(
    campaign: any,
    connection: Connection
): Promise<bigint> {
    // Account size is fixed regardless of actual string content.
    const accountDataSize = calculateCampaignAccountSize();
    const rentExemptMinimum = await connection.getMinimumBalanceForRentExemption(accountDataSize);
    
    // Ensure we don't return negative values.
    const actualContributions = campaign.lamports - BigInt(rentExemptMinimum);
    return actualContributions > BigInt(0) ? actualContributions : BigInt(0);
}