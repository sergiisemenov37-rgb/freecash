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
function calculateRegeneration(lastUpdate: string, maxEnergy: number, currentEnergy: number, regenRate: number = 1): { energy: number; lastUpdate: string } {
  const lastUpdateDate = new Date(lastUpdate);
  const now = new Date();
  const diffMs = now.getTime() - lastUpdateDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000); // Convert to minutes
  
  const regeneratedEnergy = diffMinutes * regenRate;
  const newEnergy = Math.min(maxEnergy, currentEnergy + regeneratedEnergy);
  
  return {
    energy: newEnergy,
    lastUpdate: now.toISOString()
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get user with energy regeneration
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate energy regeneration
    const { energy: regeneratedEnergy, lastUpdate: newLastUpdate } = calculateRegeneration(
      user.last_energy_update || user.created_at,
      user.max_energy,
      user.energy,
      user.energy_regen_rate || 1
    );

    // Update energy if it has regenerated
    if (regeneratedEnergy > user.energy) {
      await supabase
        .from('users')
        .update({
          energy: regeneratedEnergy,
          last_energy_update: newLastUpdate
        })
        .eq('id', userId);
      
      user.energy = regeneratedEnergy;
      user.last_energy_update = newLastUpdate;
    }

    // Get active boosts
    const { data: boosts } = await supabase
      .from('user_boosts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Get daily rewards
    const { data: dailyRewards } = await supabase
      .from('daily_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get active missions
    const { data: userMissions } = await supabase
      .from('user_missions')
      .select(`
        *,
        missions (*)
      `)
      .eq('user_id', userId)
      .eq('is_completed', false);

    // Get auto-tap job
    const { data: autoTapJob } = await supabase
      .from('auto_tap_jobs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        coins_balance: user.coins_balance,
        usdt_balance: user.usdt_balance,
        energy: user.energy,
        max_energy: user.max_energy,
        coins_per_tap: user.coins_per_tap,
        energy_regen_rate: user.energy_regen_rate,
        total_taps: user.total_taps,
        referral_code: user.referral_code
      },
      boosts: boosts || [],
      dailyRewards: dailyRewards || null,
      missions: userMissions || [],
      autoTap: autoTapJob || null
    });

  } catch (error) {
    console.error('Game state error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
