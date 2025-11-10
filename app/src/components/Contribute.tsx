"use client";

import {
  AccountRole,
  Address,
  address,
  createNoopSigner,
  createTransaction,
  LAMPORTS_PER_SOL,
} from "gill";
import { useSolanaClient } from "@gillsdk/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getContributeInstruction } from "@/generated/instructions";
import { Transaction, PublicKey } from "@solana/web3.js";
import { CONNECTION } from "@/constants";
import { SYSTEM_PROGRAM_ADDRESS } from "gill/programs";
import { useState } from "react";
import { useCampaigns } from "@/context/CampaignContext";
import { useRouter } from "next/navigation";

interface ContributeProps {
  campaignAddress: Address;
  defaultAmount?: string; // default contribution, e.g., "0.01"
}

export default function Contribute({
  campaignAddress,
  defaultAmount = "0.01",
}: ContributeProps) {
  const { publicKey, signTransaction } = useWallet();
  const { rpc } = useSolanaClient();
  const { campaigns, setCampaigns } = useCampaigns();
  const router = useRouter();
  const [amount, setAmount] = useState(defaultAmount);
  const [loading, setLoading] = useState(false);

  if (!publicKey) return <p>Connect a wallet first.</p>;

  // Find the campaign we are contributing to
  const campaignToContribute = campaigns.find(
    (c) => c.address === campaignAddress
  );

  const handleContribute = async () => {
    try {
      if (!publicKey || !signTransaction) {
        alert("No wallet connected");
        return;
      }

      setLoading(true);

      const signer = createNoopSigner(address(publicKey.toBase58()));
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const lamports = BigInt(Math.floor(Number(amount) * LAMPORTS_PER_SOL));

      const gillTransaction = createTransaction({
        version: "legacy",
        feePayer: address(publicKey.toBase58()),
        instructions: [
          getContributeInstruction({
            campaign: campaignAddress,
            contributor: signer,
            amount: BigInt(lamports),
            systemProgram: SYSTEM_PROGRAM_ADDRESS,
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

      const confirmation = await CONNECTION.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: Number(latestBlockhash.lastValidBlockHeight),
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        alert("Transaction failed: " + JSON.stringify(confirmation.value.err));
        console.error("Tx failed:", confirmation.value.err);
        return;
      }

      alert(`Contribution of ${amount} SOL successful!`);

      // Update campaigns context with new contribution
      if (campaignToContribute) {
        setCampaigns(
          campaigns.map((c) =>
            c.address === campaignAddress
              ? {
                  ...c,
                  actualContributions:
                    BigInt(c.totalContribution ?? 0) + lamports,
                }
              : c
          )
        );
      }
    } catch (error) {
      console.error(error);
      alert("Error while contributing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        type="number"
        min="0.0001"
        step="0.0001"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="border border-green-500 rounded-md px-4 py-2 w-24"
      />
      <button
        onClick={handleContribute}
        disabled={loading}
        className="px-4 py-2 bg-green-500 text-white rounded-md disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Processing..." : "Contribute"}
      </button>
    </div>
  );
}
