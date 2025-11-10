"use client";

import {
  AccountRole,
  Address,
  address,
  createNoopSigner,
  createTransaction,
} from "gill";
import { useSolanaClient } from "@gillsdk/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getWithdrawInstruction } from "@/generated/instructions";
import { Transaction, PublicKey } from "@solana/web3.js";
import { CONNECTION, GLOBAL_CAMPAIGN_STATE_ADDRESS } from "@/constants";
import { SYSTEM_PROGRAM_ADDRESS } from "gill/programs";
import { useCampaigns } from "@/context/CampaignContext";
import { useRouter } from "next/router";
import { useState } from "react";

interface WithdrawProps {
  campaignAddress: Address;
  status: "active" | "expired";
}

export default function Withdraw({ campaignAddress }: WithdrawProps) {
  const { publicKey, signTransaction } = useWallet();
  const { rpc } = useSolanaClient();
  const { campaigns, setCampaigns } = useCampaigns();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Find the campaign we are withdrawing from
  const campaignToWithdraw = campaigns.find(
    (c) => c.address === campaignAddress
  );
  const handleWithdraw = async () => {
    try {
      if (!publicKey || !signTransaction) {
        alert("No wallet connected");
        return;
      }

      setLoading(true);

      const signer = createNoopSigner(address(publicKey.toBase58()));
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const gillTransaction = createTransaction({
        version: "legacy",
        feePayer: address(publicKey.toBase58()),
        instructions: [
          getWithdrawInstruction({
            campaign: campaignAddress,
            owner: signer,
            systemProgram: SYSTEM_PROGRAM_ADDRESS,
            state: address(GLOBAL_CAMPAIGN_STATE_ADDRESS.toBase58()),
          }),
        ],
        latestBlockhash,
      });

      const transaction = new Transaction();
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = latestBlockhash.blockhash;

      for (const instruction of gillTransaction.instructions) {
        transaction.add({
          programId: new PublicKey(instruction.programAddress as string),
          keys:
            instruction.accounts?.map((account) => ({
              pubkey: new PublicKey(account.address),
              isSigner:
                account?.role === AccountRole.WRITABLE_SIGNER ||
                account?.role === AccountRole.READONLY_SIGNER,
              isWritable:
                account?.role === AccountRole.WRITABLE ||
                account?.role === AccountRole.WRITABLE_SIGNER,
            })) || [],
          data: Buffer.from(instruction?.data || []),
        });
      }

      const signedTx = await signTransaction(transaction);
      const signature = await CONNECTION.sendRawTransaction(
        signedTx.serialize()
      );
      console.log("Withdraw signature:", signature.toString());
      alert("Withdraw successful!");

      // update context & local storage
      const filteredCampaigns = campaigns.filter(
        (c) => c.address !== campaignAddress
      );
      setCampaigns(filteredCampaigns);
      if (typeof window !== "undefined") {
        localStorage.setItem("updated", JSON.stringify(true));
      }

      router.push("/");
    } catch (error) {
      console.error(error);
      alert("Error while withdrawing");
    } finally {
      setLoading(false);
    }
  };

  function getCampaignStatus() {
    return Number(campaignToWithdraw?.deadline) > Date.now() / 1000
      ? "active"
      : "expired";
  }

  return (
    <button
      onClick={handleWithdraw}
      disabled={
        loading ||
        getCampaignStatus() !== "expired" ||
        publicKey?.toString() !== campaignToWithdraw?.owner
      }
      className={`px-4 py-2 rounded-md text-white ${
        getCampaignStatus() !== "expired" ||
        publicKey?.toString() !== campaignToWithdraw?.owner
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-red-500 hover:bg-red-700 cursor-pointer"
      }`}
    >
      {getCampaignStatus() !== "expired"
        ? "Withdraw (Locked Until Deadline)"
        : "Withdraw"}
    </button>
  );
}
