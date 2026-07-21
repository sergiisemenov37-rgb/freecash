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

// Validate TON address format
function isValidTONAddress(address: string): boolean {
  // TON addresses are typically base64 encoded or raw format
  // Basic validation - adjust based on actual TON address format
  return /^[a-zA-Z0-9:_-]+$/.test(address) && address.length >= 10;
}

// Validate Solana address format
function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are base58 encoded, typically 44 characters
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address) && address.length >= 32 && address.length <= 44;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, walletAddress, network, amount } = body;

    if (!userId || !walletAddress || !network || !amount) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, walletAddress, network, amount' 
      }, { status: 400 });
    }

    if (!['TON', 'SOLANA'].includes(network)) {
      return NextResponse.json({ error: 'Invalid network. Must be TON or SOLANA' }, { status: 400 });
    }

    // Validate wallet address format
    if (network === 'TON' && !isValidTONAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid TON address format' }, { status: 400 });
    }
    if (network === 'SOLANA' && !isValidSolanaAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid Solana address format' }, { status: 400 });
    }

    // Validate amount
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get withdrawal configuration for the network
    const { data: config, error: configError } = await supabase
      .from('withdrawal_config')
      .select('*')
      .eq('network', network)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Withdrawal not available for this network' }, { status: 400 });
    }

    // Check minimum and maximum withdrawal limits
    if (withdrawalAmount < config.min_withdrawal) {
      return NextResponse.json({ 
        error: `Minimum withdrawal is ${config.min_withdrawal} ${network}` 
      }, { status: 400 });
    }

    if (withdrawalAmount > config.max_withdrawal) {
      return NextResponse.json({ 
        error: `Maximum withdrawal is ${config.max_withdrawal} ${network}` 
      }, { status: 400 });
    }

    // Get user's balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('usdt_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has sufficient balance
    const fee = (withdrawalAmount * config.fee_percentage) + config.fixed_fee;
    const totalDeduction = withdrawalAmount + fee;

    if (parseFloat(user.usdt_balance) < totalDeduction) {
      return NextResponse.json({ 
        error: 'Insufficient balance', 
        required: totalDeduction,
        available: user.usdt_balance
      }, { status: 400 });
    }

    // Check for pending withdrawal requests
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('withdrawal_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(1);

    if (pendingError) {
      console.error('Error checking pending requests:', pendingError);
    }

    if (pendingRequests && pendingRequests.length > 0) {
      return NextResponse.json({ 
        error: 'You have a pending withdrawal request. Please wait for it to be processed.' 
      }, { status: 400 });
    }

    // Deduct balance from user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        usdt_balance: parseFloat(user.usdt_balance) - totalDeduction
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update user balance:', updateError);
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: userId,
        wallet_address: walletAddress,
        network: network,
        amount: withdrawalAmount,
        fee: fee,
        status: 'pending'
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Failed to create withdrawal request:', withdrawalError);
      // Rollback balance update
      await supabase
        .from('users')
        .update({
          usdt_balance: user.usdt_balance
        })
        .eq('id', userId);
      return NextResponse.json({ error: 'Failed to create withdrawal request' }, { status: 500 });
    }

    // Create transaction record
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'withdrawal',
        amount: totalDeduction,
        currency: 'USDT',
        status: 'pending',
        description: `Withdrawal request - ${network}`,
        metadata: {
          withdrawal_id: withdrawal.id,
          network: network,
          wallet_address: walletAddress,
          fee: fee
        }
      });

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawalAmount,
        fee: fee,
        totalDeduction: totalDeduction,
        network: network,
        walletAddress: walletAddress,
        status: 'pending',
        createdAt: withdrawal.created_at
      },
      newBalance: parseFloat(user.usdt_balance) - totalDeduction
    });

  } catch (error) {
    console.error('Withdrawal request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data: withdrawals, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching withdrawals:', error);
      return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || []
    });

  } catch (error) {
    console.error('Withdrawals fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
