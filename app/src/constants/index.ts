import { Connection, PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey(
    "2fqEGPkgxeCSKgSmidAK6EVHxaEXeu2q4jDM9eHAicEX"
);
  
export const CONNECTION = new Connection("https://api.devnet.solana.com", { commitment: "confirmed" });
export const GLOBAL_CAMPAIGN_STATE_ADDRESS = new PublicKey("8Vpz3d5sDmuP8t8HfegBWVznqQLGEAcmNhPs4GpyTnvi");