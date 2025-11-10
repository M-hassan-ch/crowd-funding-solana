import { deriveGlobalCampaignStatePDA } from "@/utils";
import { Connection, PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "9h3Hsm8ypVtvQxyavYjqR87g4eyhixBHX3uvTLCpAAuK"
);

export const CONNECTION = new Connection("https://api.devnet.solana.com", {
  commitment: "confirmed",
});
export const GLOBAL_CAMPAIGN_STATE_ADDRESS = new PublicKey("5yfFCs8rKecStwQ64B3h3gKYNsExrtzyQ2tqsvapyyWc");
