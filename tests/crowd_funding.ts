import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Crowdfunding } from "../target/types/crowdfunding";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("crowdfunding", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Crowdfunding as Program<Crowdfunding>;
  const wallet = provider.wallet as anchor.Wallet;

  let statePda: PublicKey;
  let campaignPda: PublicKey;
  let campaignTitle = "My Campaign";
  let campaignDeadline: number;

  before(async () => {
    [statePda] = await PublicKey.findProgramAddress(
      [Buffer.from("campaign_state")],
      program.programId
    );
  });

  // --------------------------
  // initialize_state
  // --------------------------
  describe("initialize_state", () => {
    it("Happy: initializes global state", async () => {
      await program.methods
        .initializeState()
        .accounts({
          // state: statePda,
          user: wallet.publicKey,
          // systemProgram: SystemProgram.programId,
        })
        .rpc();

      const state = await program.account.campaignState.fetch(statePda);
      expect(state.campaigns).to.have.length(0);
    });
  });

  // --------------------------
  // create_campaign
  // --------------------------
  describe("create_campaign", () => {
    it("Happy: creates a campaign with future deadline", async () => {
      campaignDeadline = Math.floor(Date.now() / 1000) + 5; // 5 seconds
      [campaignPda] = await PublicKey.findProgramAddress(
        [Buffer.from("campaign"), wallet.publicKey.toBuffer(), Buffer.from(campaignTitle)],
        program.programId
      );

      await program.methods
        .createCampaign(campaignTitle, "Test description", new anchor.BN(campaignDeadline))
        .accounts({
          // campaign: campaignPda,
          user: wallet.publicKey,
          // state: statePda,
          // systemProgram: SystemProgram.programId,
        })
        .rpc();

      const campaign = await program.account.campaign.fetch(campaignPda);
      expect(campaign.title).to.equal(campaignTitle);
      expect(campaign.totalContribution.toNumber()).to.equal(0);
    });

    it("Negative: fails if deadline is in the past", async () => {
      const badDeadline = Math.floor(Date.now() / 1000) - 60; // 1 min ago
      const badTitle = "Past Deadline Campaign";
      const [badPda] = await PublicKey.findProgramAddress(
        [Buffer.from("campaign"), wallet.publicKey.toBuffer(), Buffer.from(badTitle)],
        program.programId
      );

      try {
        await program.methods
          .createCampaign(badTitle, "desc", new anchor.BN(badDeadline))
          .accounts({
            // campaign: badPda,
            user: wallet.publicKey,
            // state: statePda,
            // systemProgram: SystemProgram.programId,
          })
          .rpc();
        throw new Error("Expected DeadlineMustBeInFuture error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("DeadlineMustBeInFuture");
      }
    });
  });

  // --------------------------
  // contribute
  // --------------------------
  describe("contribute", () => {
    it("Happy: contributes SOL successfully", async () => {
      const amount = 1_000_000; // 0.001 SOL
      await program.methods
        .contribute(new anchor.BN(amount))
        .accounts({
          campaign: campaignPda,
          contributor: wallet.publicKey,
        })
        .rpc();

      const campaign = await program.account.campaign.fetch(campaignPda);
      expect(campaign.totalContribution.toNumber()).to.equal(amount);
    });

    it("Negative: fails if campaign expired", async () => {
      // wait until deadline passes
      console.log("Waiting for 7 seconds for deadline to pass.....");
      await new Promise((resolve) => setTimeout(resolve, 7_000));
      
      try {
        await program.methods
          .contribute(new anchor.BN(500_000))
          .accounts({
            campaign: campaignPda,
            contributor: wallet.publicKey,
          })
          .rpc();
        throw new Error("Expected CampaignExpired error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("CampaignExpired");
      }
    });

    it("Negative: fails if insufficient funds", async () => {
      const poorUser = Keypair.generate();
      const poorTitle = "Poor Campaign";
      const poorDeadline = Math.floor(Date.now() / 1000) + 120;
      const [poorCampaignPda] = await PublicKey.findProgramAddress(
        [Buffer.from("campaign"), poorUser.publicKey.toBuffer(), Buffer.from(poorTitle)],
        program.programId
      );

      // Give poorUser minimal SOL
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(poorUser.publicKey, 100_000_000),
        "confirmed"
      );

      await program.methods
        .createCampaign(poorTitle, "desc", new anchor.BN(poorDeadline))
        .accounts({
          user: poorUser.publicKey,
        })
        .signers([poorUser])
        .rpc();

      try {
        // fetch balance of poorUser
        const balance = await provider.connection.getBalance(poorUser.publicKey);

        // Try to contribute twice the balance of poorUser
        await program.methods
          .contribute(new anchor.BN(2 * balance))
          .accounts({
            campaign: poorCampaignPda,
            contributor: poorUser.publicKey,
          })
          .signers([poorUser])
          .rpc();
        throw new Error("Expected InsufficientFunds error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("InsufficientFunds");
      }
    });
  });

  // --------------------------
  // withdraw
  // --------------------------
  describe("withdraw", () => {
    it("Negative: fails if deadline not reached", async () => {
      const title = "Withdraw Early Campaign";
      const deadline = Math.floor(Date.now() / 1000) + 120;
      const [withdrawCampaignPda] = await PublicKey.findProgramAddress(
        [Buffer.from("campaign"), wallet.publicKey.toBuffer(), Buffer.from(title)],
        program.programId
      );

      await program.methods
        .createCampaign(title, "desc", new anchor.BN(deadline))
        .accounts({
          user: wallet.publicKey,
        })
        .rpc();

      try {
        await program.methods
          .withdraw()
          .accounts({
            campaign: withdrawCampaignPda,
          })
          .rpc();
        throw new Error("Expected DeadlineNotReached error");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("DeadlineNotReached");
      }
    });

    it("Happy: withdraws and closes campaign after deadline", async () => {
      const title = "Final Withdraw Campaign";
      const deadline = Math.floor(Date.now() / 1000) + 5;
      const [finalCampaignPda] = await PublicKey.findProgramAddress(
        [Buffer.from("campaign"), wallet.publicKey.toBuffer(), Buffer.from(title)],
        program.programId
      );

      await program.methods
        .createCampaign(title, "desc", new anchor.BN(deadline))
        .accounts({
          user: wallet.publicKey,
        })
        .rpc();

      // wait until deadline
      await new Promise((resolve) => setTimeout(resolve, 6000));

      await program.methods
        .withdraw()
        .accounts({
          campaign: finalCampaignPda,
        })
        .rpc();

      try {
        await program.account.campaign.fetch(finalCampaignPda);
        throw new Error("Expected account to be closed");
      } catch (err: any) {
        expect(err.message).to.include("Account does not exist");
      }
    });
  });
});
