import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client at runtime
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

// Daily reward amounts for 7-day cycle
const DAILY_REWARDS = [100, 150, 200, 300, 400, 500, 1000];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get or create daily rewards record
    const { data: dailyRewards, error: rewardsError } = await supabase
      .from('daily_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();

    let rewardsData = dailyRewards;

    if (rewardsError || !dailyRewards) {
      // Create new record
      const { data: newRewards, error: insertError } = await supabase
        .from('daily_rewards')
        .insert({
          user_id: userId,
          streak: 0,
          total_claims: 0,
          claim_history: []
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: 'Failed to create daily rewards record' }, { status: 500 });
      }
      rewardsData = newRewards;
    }

    // Check if already claimed today
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const lastClaim = rewardsData.last_claim ? new Date(rewardsData.last_claim) : null;
    const lastClaimDate = lastClaim ? lastClaim.toISOString().split('T')[0] : null;

    if (lastClaimDate === today) {
      return NextResponse.json({ 
        error: 'Already claimed today',
        nextClaimTime: new Date(now.setHours(24, 0, 0, 0)).toISOString()
      }, { status: 400 });
    }

    // Check if streak is broken (more than 24 hours since last claim)
    let streak = rewardsData.streak || 0;
    if (lastClaim) {
      const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastClaim > 48) {
        streak = 0; // Reset streak if more than 48 hours
      }
    }

    // Calculate reward based on streak (cycle through 7 days)
    const dayIndex = streak % 7;
    const rewardAmount = DAILY_REWARDS[dayIndex];
    const newStreak = streak + 1;

    // Update user balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ coins_balance: user.coins_balance + rewardAmount })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update user balance' }, { status: 500 });
    }

    // Update daily rewards record
    const updatedClaimHistory = [...(rewardsData.claim_history || []), today];
    const { data: updatedRewards, error: rewardsUpdateError } = await supabase
      .from('daily_rewards')
      .update({
        streak: newStreak,
        last_claim: now.toISOString(),
        total_claims: rewardsData.total_claims + 1,
        claim_history: updatedClaimHistory
      })
      .eq('id', rewardsData.id)
      .select()
      .single();

    if (rewardsUpdateError) {
      return NextResponse.json({ error: 'Failed to update daily rewards' }, { status: 500 });
    }

    // Create transaction record
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'daily_reward',
        amount: rewardAmount,
        currency: 'COINS',
        status: 'completed',
        description: `Daily reward claim - Day ${newStreak}`,
        metadata: {
          streak: newStreak,
          day_index: dayIndex
        }
      });

    // Update mission progress for daily reward
    await updateMissionProgress(supabase, userId, 'daily_reward', 1);

    // Get updated user
    const { data: updatedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      success: true,
      user: updatedUser,
      dailyRewards: updatedRewards,
      reward: {
        amount: rewardAmount,
        streak: newStreak,
        dayIndex: dayIndex + 1
      }
    });

  } catch (error) {
    console.error('Daily rewards claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function updateMissionProgress(supabase: any, userId: string, type: string, amount: number) {
  const { data: missions } = await supabase
    .from('missions')
    .select('*')
    .eq('requirement_type', type)
    .eq('is_active', true);

  if (!missions) return;

  for (const mission of missions) {
    const { data: userMission } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('mission_id', mission.id)
      .single();

    if (userMission && userMission.is_completed) continue;

    const currentProgress = userMission?.progress || 0;
    const newProgress = currentProgress + amount;
    const isCompleted = newProgress >= mission.requirement_target;

    if (userMission) {
      await supabase
        .from('user_missions')
        .update({
          progress: newProgress,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', userMission.id);
    } else {
      await supabase
        .from('user_missions')
        .insert({
          user_id: userId,
          mission_id: mission.id,
          progress: newProgress,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        });
    }
  }
}
