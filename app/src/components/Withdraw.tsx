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

interface WithdrawProps {
  campaignAddress: Address;
}

export default function Withdraw({ campaignAddress }: WithdrawProps) {
  const { publicKey, signTransaction } = useWallet();
  const { rpc } = useSolanaClient();

  const handleWithdraw = async () => {
    try {
      if (!publicKey || !signTransaction) {
        alert("No wallet connected");
        return;
      }

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
    } catch (error) {
      console.error(error);
      alert("Error while withdrawing");
    }
  };

  return (
    <button
      onClick={handleWithdraw}
      className="px-4 py-2 bg-red-500 text-white rounded-md"
    >
      Withdraw
    </button>
  );
}
