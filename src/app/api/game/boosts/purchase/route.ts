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

// Boost pricing configuration
const BOOST_PRICES = {
  x2_coins: { base: 1000, multiplier: 2 },
  auto_tap: { base: 5000, multiplier: 1.5 },
  energy_upgrade: { base: 2000, multiplier: 1.8 },
  critical_hit: { base: 3000, multiplier: 2 }
};

const BOOST_MAX_LEVELS = {
  x2_coins: 10,
  auto_tap: 5,
  energy_upgrade: 20,
  critical_hit: 10
};

// Calculate boost price based on level
function calculateBoostPrice(boostType: string, currentLevel: number): number {
  const config = BOOST_PRICES[boostType as keyof typeof BOOST_PRICES];
  if (!config) return 0;
  return Math.floor(config.base * Math.pow(config.multiplier, currentLevel));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, boostType } = body;

    if (!userId || !boostType) {
      return NextResponse.json({ error: 'Missing userId or boostType' }, { status: 400 });
    }

    if (!BOOST_PRICES[boostType as keyof typeof BOOST_PRICES]) {
      return NextResponse.json({ error: 'Invalid boost type' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get current user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create user boost
    const { data: existingBoost } = await supabase
      .from('user_boosts')
      .select('*')
      .eq('user_id', userId)
      .eq('boost_type', boostType)
      .single();

    const currentLevel = existingBoost?.level || 0;
    const maxLevel = BOOST_MAX_LEVELS[boostType as keyof typeof BOOST_MAX_LEVELS];

    if (currentLevel >= maxLevel) {
      return NextResponse.json({ error: 'Boost already at max level' }, { status: 400 });
    }

    const price = calculateBoostPrice(boostType, currentLevel);

    if (user.coins_balance < price) {
      return NextResponse.json({ 
        error: 'Not enough coins',
        required: price,
        current: user.coins_balance
      }, { status: 400 });
    }

    // Calculate expiration for temporary boosts
    let expiresAt = null;
    if (boostType === 'x2_coins') {
      // x2 coins lasts 30 minutes per level
      expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }

    // Update user balance
    const { error: updateError } = await supabase
      .from('users')
      .update({ coins_balance: user.coins_balance - price })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update user balance' }, { status: 500 });
    }

    // Update or create boost
    let boostData;
    if (existingBoost) {
      const { data: updatedBoost, error: boostUpdateError } = await supabase
        .from('user_boosts')
        .update({
          level: currentLevel + 1,
          is_active: true,
          expires_at: expiresAt
        })
        .eq('id', existingBoost.id)
        .select()
        .single();

      if (boostUpdateError) {
        return NextResponse.json({ error: 'Failed to update boost' }, { status: 500 });
      }
      boostData = updatedBoost;
    } else {
      const { data: newBoost, error: boostInsertError } = await supabase
        .from('user_boosts')
        .insert({
          user_id: userId,
          boost_type: boostType,
          level: 1,
          max_level: maxLevel,
          is_active: true,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (boostInsertError) {
        return NextResponse.json({ error: 'Failed to create boost' }, { status: 500 });
      }
      boostData = newBoost;
    }

    // Create transaction record
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'boost_purchase',
        amount: price,
        currency: 'COINS',
        status: 'completed',
        description: `Purchased ${boostType} boost level ${currentLevel + 1}`,
        metadata: {
          boost_type: boostType,
          level: currentLevel + 1
        }
      });

    // Update mission progress for boost purchase
    await updateMissionProgress(supabase, userId, 'boost_purchase', 1);

    // Get updated user
    const { data: updatedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      success: true,
      user: updatedUser,
      boost: boostData,
      price
    });

  } catch (error) {
    console.error('Boost purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
