import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get user's referral code
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get referral statistics using the database function
    const { data: stats, error: statsError } = await supabase
      .rpc('get_referral_stats', { p_user_id: userId });

    if (statsError) {
      console.error('Error getting referral stats:', statsError);
      // Fallback to manual calculation if function fails
      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('*')
        .eq('inviter_id', userId);

      if (referralsError) {
        return NextResponse.json({ error: 'Failed to fetch referral data' }, { status: 500 });
      }

      const totalInvited = referrals?.length || 0;
      const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;
      const coinsEarned = referrals?.reduce((sum, r) => sum + (parseFloat(r.coins_rewarded) || 0), 0) || 0;
      const usdtEarned = referrals?.reduce((sum, r) => sum + (parseFloat(r.usdt_rewarded) || 0), 0) || 0;
      const todayReferrals = referrals?.filter(r => {
        const today = new Date().toISOString().split('T')[0];
        return r.created_at?.startsWith(today);
      }).length || 0;
      const monthReferrals = referrals?.filter(r => {
        const now = new Date();
        const referralDate = new Date(r.created_at);
        return referralDate.getMonth() === now.getMonth() && 
               referralDate.getFullYear() === now.getFullYear();
      }).length || 0;

      return NextResponse.json({
        success: true,
        referralCode: user.referral_code,
        referralLink: `https://t.me/FreeCoinWeb_bot/app?startapp=${user.referral_code}`,
        stats: {
          total_invited: totalInvited,
          active_referrals: activeReferrals,
          coins_earned: coinsEarned,
          usdt_earned: usdtEarned,
          today_referrals: todayReferrals,
          month_referrals: monthReferrals
        }
      });
    }

    return NextResponse.json({
      success: true,
      referralCode: user.referral_code,
      referralLink: `https://t.me/FreeCoinWeb_bot/app?startapp=${user.referral_code}`,
      stats: stats
    });

  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
