"use client";

import { AccountRole, Address, address, createNoopSigner, createTransaction, LAMPORTS_PER_SOL } from "gill";
import { useSolanaClient } from "@gillsdk/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getWithdrawInstruction } from "@/generated/instructions";
import { Transaction, PublicKey } from "@solana/web3.js";
import { CONNECTION, GLOBAL_CAMPAIGN_STATE_ADDRESS } from "@/constants";
import { SYSTEM_PROGRAM_ADDRESS } from "gill/programs";

export default function Withdraw() {
    const { publicKey, signTransaction, connect } = useWallet();
    const { rpc } = useSolanaClient();

    //fetch campaing account address from the route URL

    const withdraw = async (campaignAddress: Address) => {
        try {
            if (!publicKey || !signTransaction) {
                window.alert("No wallet connected");
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
            {/* contributing 0.0001 SOL */}
            <button onClick={()=> {withdraw(address("Fz3B131okxZAug3ws1c2SotXoePENJKYDWVzuThYpPT4"))}}>Withdraw</button>
        </div>
    );
}
