"use client";

import { useRouter } from "next/navigation";
import {
  AccountRole,
  address,
  createNoopSigner,
  createTransaction,
} from "gill";
import { useSolanaClient } from "@gillsdk/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { deriveCampaignPDA } from "@/utils";
import { getCreateCampaignInstruction } from "@/generated/instructions";
import { Transaction, PublicKey } from "@solana/web3.js";
import { CONNECTION, GLOBAL_CAMPAIGN_STATE_ADDRESS } from "@/constants";
import { SYSTEM_PROGRAM_ADDRESS } from "gill/programs";
import { useState } from "react";
import { useCampaigns } from "@/context/CampaignContext";

export default function CreateCampaign() {
  const { publicKey, signTransaction } = useWallet();
  const { rpc } = useSolanaClient();
  const { campaigns, setCampaigns } = useCampaigns();
  const router = useRouter();

  // state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  const createCampaign = async () => {
    if (!publicKey || !signTransaction) {
      alert("No wallet connected");
      return;
    }
    if (!title || !description || !deadline) {
      alert("Please fill all fields");
      return;
    }
    const deadlineBigInt = BigInt(
      Math.floor(new Date(deadline).getTime() / 1000)
    );
    if (
      !deadlineBigInt ||
      deadlineBigInt <= BigInt(Math.floor(Date.now() / 1000))
    ) {
      return alert("Deadline must be in the future");
    }
    setLoading(true);
    try {
      const campaignPDA = deriveCampaignPDA(publicKey, title);
      if (!campaignPDA) {
        alert("Failed to derive campaign address");
        return;
      }
      const signer = createNoopSigner(address(publicKey.toBase58()));
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
      const gillTransaction = createTransaction({
        version: "legacy",
        feePayer: address(publicKey.toBase58()),
        instructions: [
          getCreateCampaignInstruction({
            campaign: address(campaignPDA.toBase58()),
            state: address(GLOBAL_CAMPAIGN_STATE_ADDRESS.toBase58()),
            user: signer,
            title: title,
            description: description,
            deadline: deadlineBigInt,
            systemProgram: SYSTEM_PROGRAM_ADDRESS,
          }),
        ],
        latestBlockhash,
      });
      // Convert gill transaction to web3.js Transaction.
      const transaction = new Transaction();
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = latestBlockhash.blockhash;
      // Convert gill instructions to web3.js instructions.
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
      const confirmation = await CONNECTION.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: Number(latestBlockhash.lastValidBlockHeight),
        },
        "confirmed"
      );
      // Check if transaction succeeded
      if (confirmation.value.err) {
        alert("Transaction failed: " + JSON.stringify(confirmation.value.err));
        console.error("Tx failed:", confirmation.value.err);
      } else {
        alert(`Transaction successful! Signature: ${signature}`);
        setCampaigns([
          ...campaigns,
          {
            title,
            description,
            deadline: Number(deadlineBigInt),
            address: campaignPDA.toBase58(),
            owner: publicKey.toBase58(),
            totalContribution: BigInt(0),
            status: "active",
          },
        ]);
        console.log("Transaction confirmed on-chain:", signature);
        if (typeof window !== "undefined") {
          localStorage.setItem("updated", JSON.stringify(true));
        }
        router.push("/campaigns/mine");
      }
    } catch (error: any) {
      console.error(error);
      alert(`Error creating campaign: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-md space-y-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Campaign Title"
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Campaign Description"
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700"
      />
      <input
        type="datetime-local"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:border-zinc-700"
      />
      <button
        onClick={createCampaign}
        disabled={loading || !title || !description || !deadline}
        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "Creating..." : "Create Campaign"}
      </button>
    </div>
  );
}
