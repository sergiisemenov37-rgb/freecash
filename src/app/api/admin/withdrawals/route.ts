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

// Simple admin authentication - in production, use proper auth
function isAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_SECRET_KEY;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const network = searchParams.get('network');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = getSupabaseClient();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        users!withdrawal_requests_user_id_fkey (
          telegram_id,
          username,
          first_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (network) {
      query = query.eq('network', network);
    }

    const { data: withdrawals, error, count } = await query;

    if (error) {
      console.error('Error fetching withdrawals:', error);
      return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Admin withdrawals fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { withdrawalId, status, adminId, transactionHash, adminNotes } = body;

    if (!withdrawalId || !status) {
      return NextResponse.json({ error: 'Missing withdrawalId or status' }, { status: 400 });
    }

    if (!['approved', 'rejected', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get current withdrawal
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    // Check if withdrawal can be updated
    if (withdrawal.status !== 'pending' && withdrawal.status !== 'approved') {
      return NextResponse.json({ 
        error: `Cannot update withdrawal with status ${withdrawal.status}` 
      }, { status: 400 });
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      status,
      admin_id: adminId,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed' || status === 'cancelled') {
      updateData.processed_at = new Date().toISOString();
    }

    if (transactionHash) {
      updateData.transaction_hash = transactionHash;
    }

    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }

    // Handle balance refund for rejected/cancelled withdrawals
    if (status === 'rejected' || status === 'cancelled') {
      const totalDeduction = withdrawal.amount + withdrawal.fee;
      
      // Get current balance first
      const { data: currentUser } = await supabase
        .from('users')
        .select('usdt_balance')
        .eq('id', withdrawal.user_id)
        .single();
      
      const newBalance = (currentUser?.usdt_balance || 0) + totalDeduction;
      
      const { error: refundError } = await supabase
        .from('users')
        .update({
          usdt_balance: newBalance
        })
        .eq('id', withdrawal.user_id);

      if (refundError) {
        console.error('Failed to refund user balance:', refundError);
        return NextResponse.json({ error: 'Failed to refund user balance' }, { status: 500 });
      }

      // Create refund transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: withdrawal.user_id,
          type: 'admin_adjustment',
          amount: totalDeduction,
          currency: 'USDT',
          status: 'completed',
          description: `Withdrawal ${status} - refund`,
          metadata: {
            withdrawal_id: withdrawalId,
            original_amount: withdrawal.amount,
            fee: withdrawal.fee
          }
        });
    }

    // Update withdrawal status
    const { data: updatedWithdrawal, error: updateError } = await supabase
      .from('withdrawal_requests')
      .update(updateData)
      .eq('id', withdrawalId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update withdrawal:', updateError);
      return NextResponse.json({ error: 'Failed to update withdrawal' }, { status: 500 });
    }

    // Update transaction status
    const { error: transactionUpdateError } = await supabase
      .from('transactions')
      .update({
        status: status === 'completed' ? 'completed' : status === 'rejected' || status === 'cancelled' ? 'cancelled' : 'pending'
      })
      .eq('metadata->>withdrawal_id', withdrawalId);

    if (transactionUpdateError) {
      console.error('Failed to update transaction:', transactionUpdateError);
    }

    return NextResponse.json({
      success: true,
      withdrawal: updatedWithdrawal
    });

  } catch (error) {
    console.error('Admin withdrawal update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
