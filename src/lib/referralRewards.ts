import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' },
    global: {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    }
  });
}

export async function processReferralReward(
  userId: string,
  amount: number,
  currency: 'COINS' | 'USDT',
  sourceType: string
): Promise<void> {
  const supabase = getSupabaseClient();

  // Get the referral record for this user
  const { data: referral, error: referralError } = await supabase
    .from('referrals')
    .select('inviter_id, coins_rewarded, usdt_rewarded')
    .eq('invitee_id', userId)
    .eq('status', 'active')
    .single();

  if (referralError || !referral) {
    // No active referral, nothing to do
    return;
  }

  // Calculate 5% reward
  const rewardAmount = amount * 0.05;

  if (rewardAmount <= 0) {
    return;
  }

  // Update inviter's balance
  const balanceColumn = currency === 'COINS' ? 'coins_balance' : 'usdt_balance';
  const { data: inviter } = await supabase
    .from('users')
    .select(balanceColumn)
    .eq('id', referral.inviter_id)
    .single();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentBalance = (inviter as any)?.[balanceColumn] || 0;
  const newBalance = currentBalance + rewardAmount;
  
  const { error: updateError } = await supabase
    .from('users')
    .update({
      [balanceColumn]: newBalance
    })
    .eq('id', referral.inviter_id);

  if (updateError) {
    console.error('Failed to update inviter balance:', updateError);
    return;
  }

  // Update referral record with rewarded amounts
  const rewardColumn = currency === 'COINS' ? 'coins_rewarded' : 'usdt_rewarded';
  const currentReward = referral?.[rewardColumn] || 0;
  const newReward = currentReward + rewardAmount;
  
  const { error: referralUpdateError } = await supabase
    .from('referrals')
    .update({
      [rewardColumn]: newReward
    })
    .eq('invitee_id', userId);

  if (referralUpdateError) {
    console.error('Failed to update referral rewards:', referralUpdateError);
  }

  // Create transaction record for the referral reward
  await supabase
    .from('transactions')
    .insert({
      user_id: referral.inviter_id,
      type: 'referral_reward',
      amount: rewardAmount,
      currency: currency,
      status: 'completed',
      description: `Referral reward from ${sourceType}`,
      metadata: {
        source_type: sourceType,
        invitee_id: userId
      }
    });
}
