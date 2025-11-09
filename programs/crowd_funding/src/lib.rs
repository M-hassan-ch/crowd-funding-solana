use anchor_lang::prelude::*;
use anchor_lang::solana_program::{clock::Clock, system_instruction};

declare_id!("9h3Hsm8ypVtvQxyavYjqR87g4eyhixBHX3uvTLCpAAuK");

#[program]
pub mod crowdfunding {
    use super::*;

    pub fn initialize_state(ctx: Context<InitializeState>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.campaigns = Vec::new();
        Ok(())
    }

    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        title: String,
        description: String,
        deadline: i64,
    ) -> Result<()> {
        require!(
            deadline > Clock::get()?.unix_timestamp,
            ErrorCode::DeadlineMustBeInFuture
        );

        let campaign = &mut ctx.accounts.campaign;
        campaign.owner = *ctx.accounts.user.key;
        campaign.title = title.clone();
        campaign.description = description.clone();
        campaign.deadline = deadline;
        campaign.total_contribution = 0;

        // Record this campaign’s address in the global state
        let state = &mut ctx.accounts.state;
        state.campaigns.push(campaign.key());
        Ok(())
    }

    pub fn contribute(ctx: Context<Contribute>, amount: u64) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        // Campaign must still be active
        require!(
            Clock::get()?.unix_timestamp < campaign.deadline,
            ErrorCode::CampaignExpired
        );

        // Ensure contributor has sufficient lamports
        let contributor_balance = ctx.accounts.contributor.lamports();
        require!(
            contributor_balance >= amount,
            ErrorCode::InsufficientFunds
        );

        // Transfer SOL (lamports) from contributor to campaign
        let ix = system_instruction::transfer(
            &ctx.accounts.contributor.key(),
            &campaign.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.contributor.to_account_info(),
                campaign.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Update the stored total
        campaign.total_contribution = campaign
            .total_contribution
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let campaign = &ctx.accounts.campaign;

        require!(
            Clock::get()?.unix_timestamp >= campaign.deadline,
            ErrorCode::DeadlineNotReached
        );

        // Remove the campaign from the global state before closing.
        let state = &mut ctx.accounts.state;
        state.campaigns.retain(|&campaign_key| campaign_key != campaign.key());

        // Account will be closed automatically by Anchor and lamports
        // sent to owner because of `close = owner`.
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeState<'info> {
    #[account(
        init,
        seeds = [b"campaign_state"],
        bump,
        payer = user,
        space = 8 + CampaignState::INIT_SPACE
    )]
    pub state: Account<'info, CampaignState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        seeds = [b"campaign", user.key().as_ref(), title.as_bytes()],
        bump,
        payer = user,
        space = 8 + Campaign::INIT_SPACE
    )]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    #[account(mut, seeds = [b"campaign_state"], bump)]
    pub state: Account<'info, CampaignState>,
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub contributor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, has_one = owner, close = owner)]
    pub campaign: Account<'info, Campaign>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [b"campaign_state"], bump)]
    pub state: Account<'info, CampaignState>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub owner: Pubkey,
    #[max_len(200)]
    pub title: String,
    #[max_len(1000)]
    pub description: String,
    pub deadline: i64,
    pub total_contribution: u64,
}

#[account]
#[derive(InitSpace)]
pub struct CampaignState {
    #[max_len(100)]
    pub campaigns: Vec<Pubkey>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Deadline must be in the future")]
    DeadlineMustBeInFuture,
    #[msg("Campaign has already expired")]
    CampaignExpired,
    #[msg("Deadline has not been reached")]
    DeadlineNotReached,
    #[msg("Overflow detected")]
    Overflow,
    #[msg("Insufficient funds to contribute")]
    InsufficientFunds,
}
