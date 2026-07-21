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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, missionId } = body;

    if (!userId || !missionId) {
      return NextResponse.json({ error: 'Missing userId or missionId' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get user mission
    const { data: userMission, error: missionError } = await supabase
      .from('user_missions')
      .select(`
        *,
        missions (*)
      `)
      .eq('user_id', userId)
      .eq('mission_id', missionId)
      .single();

    if (missionError || !userMission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    if (!userMission.is_completed) {
      return NextResponse.json({ error: 'Mission not completed yet' }, { status: 400 });
    }

    if (userMission.is_claimed) {
      return NextResponse.json({ error: 'Reward already claimed' }, { status: 400 });
    }

    const mission = userMission.missions as {
      id: string;
      mission_type: string;
      title: string;
      description: string;
      requirement_type: string;
      requirement_target: number;
      reward_coins: number;
      reward_usdt: number;
    };
    const rewardCoins = mission.reward_coins || 0;
    const rewardUsdt = mission.reward_usdt || 0;

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user balance
    const { error: updateError } = await supabase
      .from('users')
      .update({
        coins_balance: user.coins_balance + rewardCoins,
        usdt_balance: parseFloat(user.usdt_balance.toString()) + rewardUsdt
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update user balance' }, { status: 500 });
    }

    // Mark mission as claimed
    const { data: updatedMission, error: claimError } = await supabase
      .from('user_missions')
      .update({
        is_claimed: true,
        claimed_at: new Date().toISOString()
      })
      .eq('id', userMission.id)
      .select()
      .single();

    if (claimError) {
      return NextResponse.json({ error: 'Failed to claim reward' }, { status: 500 });
    }

    // Create transaction record
    if (rewardCoins > 0) {
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'reward',
          amount: rewardCoins,
          currency: 'COINS',
          status: 'completed',
          description: `Mission reward: ${mission.title}`,
          metadata: {
            mission_id: missionId,
            mission_title: mission.title
          }
        });
    }

    if (rewardUsdt > 0) {
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: 'reward',
          amount: rewardUsdt,
          currency: 'USDT',
          status: 'completed',
          description: `Mission reward: ${mission.title}`,
          metadata: {
            mission_id: missionId,
            mission_title: mission.title
          }
        });
    }

    // Get updated user
    const { data: updatedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      success: true,
      user: updatedUser,
      mission: updatedMission,
      reward: {
        coins: rewardCoins,
        usdt: rewardUsdt
      }
    });

  } catch (error) {
    console.error('Mission claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
