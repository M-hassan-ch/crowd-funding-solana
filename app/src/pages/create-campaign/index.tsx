"use client";

import { AccountRole, address, createNoopSigner, createTransaction } from "gill";
import { useSolanaClient } from "@gillsdk/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { deriveCampaignPDA } from "@/utils";
import { getCreateCampaignInstruction } from "@/generated/instructions";
import { Transaction, PublicKey } from "@solana/web3.js";
import { CONNECTION, GLOBAL_CAMPAIGN_STATE_ADDRESS } from "@/constants";
import { SYSTEM_PROGRAM_ADDRESS } from "gill/programs";

export default function CreateCampaign() {
    const { publicKey, signTransaction, connect } = useWallet();
    const { rpc } = useSolanaClient();

    const createCampaign = async () => {
        try {
            if (!publicKey || !signTransaction) {
                window.alert("No wallet connected");
                return;
            }
            const title = "Test Campaign2";
            const description = "Test Description";
            const deadline = BigInt("1762701060");
            const campaignPDA = deriveCampaignPDA(publicKey, title);
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
                        deadline: deadline,
                        systemProgram: SYSTEM_PROGRAM_ADDRESS
                    })
                ],
                latestBlockhash
            });

            // Convert gill transaction to web3.js Transaction.
            const transaction = new Transaction();
            transaction.feePayer = publicKey;
            transaction.recentBlockhash = latestBlockhash.blockhash;

            // Convert gill instructions to web3.js instructions.
            for (const instruction of gillTransaction.instructions) {
                transaction.add({
                    programId: new PublicKey(instruction.programAddress as string),
                    keys: instruction.accounts?.map(account => ({
                        pubkey: new PublicKey(account.address),
                        isSigner: account?.role === AccountRole.WRITABLE_SIGNER || account?.role === AccountRole.READONLY_SIGNER,
                        isWritable: account?.role === AccountRole.WRITABLE || account?.role === AccountRole.WRITABLE_SIGNER,
                    })) || [],
                    data: Buffer.from(instruction?.data || []),
                });
            }
            const signedTx = await signTransaction(transaction);
            const signature = await CONNECTION.sendRawTransaction(signedTx.serialize())
            console.log("Signature:", signature.toString());
        } catch (error) {
            window.alert("Error while creating campaign")
            console.log(error);
        }
    }

    return (
        <div>
            <button onClick={createCampaign}>Create Campaign</button>
        </div>
    );
}
