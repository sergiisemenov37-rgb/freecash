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

// Calculate energy regeneration
function calculateRegeneration(lastUpdate: string, maxEnergy: number, currentEnergy: number, regenRate: number = 1): number {
  const lastUpdateDate = new Date(lastUpdate);
  const now = new Date();
  const diffMs = now.getTime() - lastUpdateDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000); // Convert to minutes
  
  const regeneratedEnergy = diffMinutes * regenRate;
  const newEnergy = Math.min(maxEnergy, currentEnergy + regeneratedEnergy);
  
  return newEnergy;
}

// Check for active boosts
async function getActiveBoosts(supabase: any, userId: string): Promise<{
  x2_coins: boolean;
  auto_tap: boolean;
  critical_hit: boolean;
  energy_upgrade: number;
}> {
  const { data: boosts } = await supabase
    .from('user_boosts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  const activeBoosts = {
    x2_coins: false,
    auto_tap: false,
    critical_hit: false,
    energy_upgrade: 0
  };
  
  if (boosts) {
    for (const boost of boosts) {
      // Check if boost is expired
      if (boost.expires_at && new Date(boost.expires_at) < new Date()) {
        await supabase
          .from('user_boosts')
          .update({ is_active: false })
          .eq('id', boost.id);
        continue;
      }
      
      switch (boost.boost_type) {
        case 'x2_coins':
          activeBoosts.x2_coins = true;
          break;
        case 'auto_tap':
          activeBoosts.auto_tap = true;
          break;
        case 'critical_hit':
          activeBoosts.critical_hit = true;
          break;
        case 'energy_upgrade':
          activeBoosts.energy_upgrade = boost.level;
          break;
      }
    }
  }
  
  return activeBoosts;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tapCount = 1 } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (tapCount < 1 || tapCount > 100) {
      return NextResponse.json({ error: 'Invalid tap count' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get current user state
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate energy regeneration
    const regeneratedEnergy = calculateRegeneration(
      user.last_energy_update || user.created_at,
      user.max_energy,
      user.energy,
      user.energy_regen_rate || 1
    );

    // Get active boosts
    const activeBoosts = await getActiveBoosts(supabase, userId);

    // Calculate max energy with upgrades
    const maxEnergyWithUpgrade = user.max_energy + (activeBoosts.energy_upgrade * 100);
    const currentEnergy = Math.min(maxEnergyWithUpgrade, regeneratedEnergy);

    // Check if user has enough energy
    if (currentEnergy < tapCount) {
      return NextResponse.json({ 
        error: 'Not enough energy',
        currentEnergy,
        requiredEnergy: tapCount
      }, { status: 400 });
    }

    // Calculate coins per tap with x2 boost
    const coinsPerTap = user.coins_per_tap || 1;
    const multiplier = activeBoosts.x2_coins ? 2 : 1;
    
    // Calculate critical hit
    let isCritical = false;
    let criticalMultiplier = 1;
    if (activeBoosts.critical_hit) {
      const criticalChance = 0.1; // 10% chance
      isCritical = Math.random() < criticalChance;
      criticalMultiplier = isCritical ? 3 : 1;
    }

    const totalCoins = tapCount * coinsPerTap * multiplier * criticalMultiplier;
    const newEnergy = currentEnergy - tapCount;
    const newTotalTaps = (user.total_taps || 0) + tapCount;
    const newCoinsBalance = user.coins_balance + totalCoins;

    // Update user atomically
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        coins_balance: newCoinsBalance,
        energy: newEnergy,
        total_taps: newTotalTaps,
        last_energy_update: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'tap',
        amount: totalCoins,
        currency: 'COINS',
        status: 'completed',
        description: `Tap reward: ${tapCount} taps`,
        metadata: {
          tap_count: tapCount,
          is_critical: isCritical,
          multiplier: multiplier * criticalMultiplier
        }
      });

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      // Don't fail the request if transaction logging fails
    }

    // Update mission progress
    await updateMissionProgress(supabase, userId, 'taps', tapCount);
    await updateMissionProgress(supabase, userId, 'coins', totalCoins);

    return NextResponse.json({
      success: true,
      user: updatedUser,
      tapReward: {
        coins: totalCoins,
        energyUsed: tapCount,
        isCritical,
        multiplier: multiplier * criticalMultiplier
      }
    });

  } catch (error) {
    console.error('Tap error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function updateMissionProgress(supabase: any, userId: string, type: string, amount: number) {
  // Get active missions for this requirement type
  const { data: missions } = await supabase
    .from('missions')
    .select('*')
    .eq('requirement_type', type)
    .eq('is_active', true);

  if (!missions) return;

  for (const mission of missions) {
    // Get or create user mission progress
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
