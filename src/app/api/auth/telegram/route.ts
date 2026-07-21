import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client at runtime to avoid build-time errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    }
  });
}

function getBotToken() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable');
  }
  return botToken;
}

/**
 * Validates Telegram initData
 * Based on Telegram's WebApp documentation
 */
function validateInitData(initData: string): boolean {
  console.log('[AUTH] === INITDATA VALIDATION START ===');
  
  if (!initData) {
    console.log('[AUTH] ❌ initData is empty');
    return false;
  }

  try {
    console.log('[AUTH] Parsing initData as URLSearchParams...');
    const url = new URLSearchParams(initData);
    const hash = url.get('hash');
    
    console.log('[AUTH] Hash from initData:', hash ? hash.substring(0, 20) + '...' : 'MISSING');
    
    if (!hash) {
      console.log('[AUTH] ❌ No hash found in initData');
      return false;
    }

    // Remove hash from data
    url.delete('hash');
    console.log('[AUTH] Hash removed from data');
    
    // Sort keys alphabetically
    console.log('[AUTH] Sorting keys alphabetically...');
    const dataCheckString = Array.from(url.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    console.log('[AUTH] Data check string (first 200 chars):', dataCheckString.substring(0, 200) + '...');
    console.log('[AUTH] Data check string length:', dataCheckString.length);

    // Create HMAC-SHA256
    console.log('[AUTH] Creating secret key from bot token...');
    const botToken = getBotToken();
    console.log('[AUTH] Bot token first 10 chars:', botToken.substring(0, 10));
    console.log('[AUTH] Bot token last 5 chars:', botToken.substring(botToken.length - 5));
    
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    console.log('[AUTH] Secret key created (length:', secretKey.length, ')');

    console.log('[AUTH] Computing HMAC-SHA256...');
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    console.log('[AUTH] Computed hash:', computedHash.substring(0, 20) + '...');
    console.log('[AUTH] Received hash:', hash.substring(0, 20) + '...');

    const isValid = computedHash === hash;
    console.log('[AUTH] Hash comparison result:', isValid ? 'MATCH' : 'MISMATCH');
    
    if (!isValid) {
      console.log('[AUTH] ❌ Hashes do not match');
      console.log('[AUTH] Full computed hash:', computedHash);
      console.log('[AUTH] Full received hash:', hash);
    }
    
    return isValid;
  } catch (error) {
    console.error('[AUTH] ❌ Error validating initData:', error);
    return false;
  }
}

/**
 * Extract user from initData
 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractUser(initData: string): any {
  try {
    const url = new URLSearchParams(initData);
    const userStr = url.get('user');
    
    if (!userStr) {
      console.log('[AUTH] No user data in initData');
      return null;
    }

    const user = JSON.parse(decodeURIComponent(userStr));
    console.log('[AUTH] Extracted user:', user);
    return user;
  } catch (error) {
    console.error('[AUTH] Error extracting user:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log('[AUTH] === REQUEST RECEIVED ===');
  console.log('[AUTH] Timestamp:', new Date().toISOString());
  console.log('[AUTH] Method:', request.method);
  console.log('[AUTH] URL:', request.url);
  
  try {
    const body = await request.json();
    const { initData, referralCode } = body;

    console.log('[AUTH] initData received:', initData ? 'YES' : 'NO');
    console.log('[AUTH] initData length:', initData?.length || 0);
    console.log('[AUTH] initData preview:', initData?.substring(0, 100) + '...' || 'empty');
    console.log('[AUTH] referralCode received:', referralCode || 'NONE');
    
    // Log detailed initData structure
    if (initData) {
      console.log('[AUTH] === DETAILED INITDATA STRUCTURE ===');
      try {
        const urlParams = new URLSearchParams(initData);
        console.log('[AUTH] All parameters in initData:');
        urlParams.forEach((value, key) => {
          console.log(`[AUTH]   ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
        });
        
        const userStr = urlParams.get('user');
        if (userStr) {
          console.log('[AUTH] User data found:', userStr.substring(0, 100) + '...');
        }
        
        const hash = urlParams.get('hash');
        console.log('[AUTH] Hash:', hash ? hash.substring(0, 20) + '...' : 'MISSING');
        
        const authDate = urlParams.get('auth_date');
        console.log('[AUTH] Auth date:', authDate);
        
        const queryId = urlParams.get('query_id');
        console.log('[AUTH] Query ID:', queryId);
      } catch (error) {
        console.error('[AUTH] Error parsing initData structure:', error);
      }
    }

    // Step 1: Validate initData
    console.log('[AUTH] === STEP 1: VALIDATING INITDATA ===');
    const isValid = validateInitData(initData);
    console.log('[AUTH] initData validation result:', isValid ? 'VALID' : 'INVALID');
    
    if (!isValid) {
      console.log('[AUTH] ❌ initData validation failed');
      return NextResponse.json(
        { error: 'Invalid initData' },
        { status: 401 }
      );
    }

    console.log('[AUTH] ✓ initData validated successfully');

    // Step 2: Extract user
    console.log('[AUTH] === STEP 2: EXTRACTING TELEGRAM USER ===');
    const telegramUser = extractUser(initData);
    console.log('[AUTH] Telegram user extraction result:', telegramUser ? 'SUCCESS' : 'FAILED');
    
    if (!telegramUser) {
      console.log('[AUTH] ❌ Failed to extract user from initData');
      return NextResponse.json(
        { error: 'Failed to extract user' },
        { status: 400 }
      );
    }

    console.log('[AUTH] ✓ Telegram user extracted:', telegramUser);

    const telegramId = telegramUser.id;
    console.log('[AUTH] Telegram user ID:', telegramId);

    // Step 3: Create or get auth user using admin client
    console.log('[AUTH] === STEP 3: SUPABASE AUTH USER CREATION ===');
    console.log('[AUTH] Creating/getting auth user with admin client...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseClient() as any;
    const email = `telegram_${telegramId}@freecash.app`;
    const password = telegramId.toString();
    console.log('[AUTH] Email:', email);
    console.log('[AUTH] Password length:', password.length);
    
    // Use admin client to create user with auto-confirmation
    console.log('[AUTH] Calling supabase.auth.admin.createUser...');
    const { error: authCreateError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        telegram_id: telegramId,
      }
    });

    console.log('[AUTH] Auth user creation result:', authCreateError ? 'FAILED' : 'SUCCESS');
    if (authCreateError) {
      console.log('[AUTH] Auth creation error:', authCreateError.message);
      console.log('[AUTH] Auth creation error code:', authCreateError.code);
    }

    let session = null;

    // If user already exists, sign in with admin client
    if (authCreateError && (authCreateError.message.includes('already registered') || authCreateError.code === 'email_exists')) {
      console.log('[AUTH] Auth user already exists, getting user ID and confirming email...');
      
      // Get user by email
      console.log('[AUTH] Calling supabase.auth.admin.listUsers...');
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      
      console.log('[AUTH] List users result:', listError ? 'FAILED' : 'SUCCESS');
      if (listError) {
        console.error('[AUTH] Failed to list users:', listError);
      } else if (usersData?.users) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingUser = usersData.users.find((u: any) => u.email === email);
        if (existingUser) {
          console.log('[AUTH] Found existing user:', existingUser.id);
          
          // Confirm email using admin client
          console.log('[AUTH] Confirming email for existing user...');
          const { error: confirmError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { email_confirm: true }
          );

          if (confirmError) {
            console.log('[AUTH] Could not confirm email (may already be confirmed):', confirmError.message);
          } else {
            console.log('[AUTH] Email confirmed successfully');
          }
        }
      }

      console.log('[AUTH] Signing in with existing credentials...');
      const { data: { session: signInSession }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[AUTH] Sign in result:', signInError ? 'FAILED' : 'SUCCESS');
      if (signInError) {
        console.error('[AUTH] Failed to sign in:', signInError);
        return NextResponse.json(
          { error: 'Failed to authenticate', details: signInError },
          { status: 500 }
        )
      }

      session = signInSession;
      console.log('[AUTH] ✓ Signed in successfully');
    } else if (authCreateError) {
      console.error('[AUTH] ❌ Failed to create auth user:', authCreateError);
      return NextResponse.json(
        { error: 'Failed to create auth user', details: authCreateError },
        { status: 500 }
      );
    } else {
      console.log('[AUTH] ✓ Auth user created successfully');
      // Create session for new user
      console.log('[AUTH] Creating session for new user...');
      const { data: { session: newSession }, error: sessionError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[AUTH] Session creation result:', sessionError ? 'FAILED' : 'SUCCESS');
      if (sessionError) {
        console.error('[AUTH] Failed to create session:', sessionError);
        return NextResponse.json(
          { error: 'Failed to create session', details: sessionError },
          { status: 500 }
        );
      }

      session = newSession;
      console.log('[AUTH] ✓ Session created successfully');
    }

    // Step 4: Check if user exists in database
    console.log('[AUTH] === STEP 4: CHECKING USER IN DATABASE ===');
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    console.log('[AUTH] User query result:', { existingUser, selectError });

    let user = existingUser;

    // Step 5: Validate referral code if provided
    let inviterId: string | null = null;
    if (referralCode && !existingUser) {
      console.log('[AUTH] === STEP 5: VALIDATING REFERRAL CODE ===');
      console.log('[AUTH] Referral code provided, validating...');
      
      // Check if referral code exists and get inviter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inviter, error: inviterError } = await (supabase as any)
        .from('users')
        .select('id, telegram_id')
        .eq('referral_code', referralCode)
        .single();
      
      if (inviterError || !inviter) {
        console.log('[AUTH] Invalid referral code:', referralCode);
      } else {
        // Prevent self-referral
        if (inviter.telegram_id === telegramId) {
          console.log('[AUTH] Self-referral detected, ignoring');
        } else {
          inviterId = inviter.id;
          console.log('[AUTH] Valid referral code, inviter ID:', inviterId);
        }
      }
    }

    // Step 6: Create user in database if not exists
    if (!existingUser) {
      console.log('[AUTH] === STEP 6: CREATING USER IN DATABASE ===');
      console.log('[AUTH] User does not exist in database, creating new user...');
      const userReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      console.log('[AUTH] Generated referral code:', userReferralCode);

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          username: telegramUser.username || '',
          first_name: telegramUser.first_name || '',
          last_name: telegramUser.last_name || '',
          coins_balance: 0,
          usdt_balance: 0,
          energy: 1000,
          max_energy: 1000,
          referral_code: userReferralCode,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[AUTH] ❌ Failed to create user:', insertError);
        return NextResponse.json(
          { error: 'Failed to create user', details: insertError },
          { status: 500 }
        );
      }

      console.log('[AUTH] ✓ User created successfully:', newUser);
      user = newUser;

      // Step 7: Create referral record if valid referral code was provided
      if (inviterId) {
        console.log('[AUTH] === STEP 7: CREATING REFERRAL RECORD ===');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: referralError } = await (supabase as any)
          .from('referrals')
          .insert({
            inviter_id: inviterId,
            invitee_id: user.id,
            referral_code: referralCode,
            status: 'active'
          });
        
        if (referralError) {
          console.error('[AUTH] Failed to create referral record:', referralError);
        } else {
          console.log('[AUTH] ✓ Referral record created successfully');
        }
      }

      // Step 8: Create profile
      console.log('[AUTH] === STEP 8: CREATING PROFILE ===');
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          level: 1,
          experience: 0,
        })
        .select()
        .single();

      if (profileError) {
        console.error('[AUTH] ❌ Failed to create profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to create profile', details: profileError },
          { status: 500 }
        );
      }

      console.log('[AUTH] ✓ Profile created successfully:', newProfile);

      // Step 9: Create wallet
      console.log('[AUTH] === STEP 9: CREATING WALLET ===');
      const { data: newWallet, error: walletError } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          balance: 0,
          currency: 'USDT',
          is_active: true,
        })
        .select()
        .single();

      if (walletError) {
        console.error('[AUTH] ❌ Failed to create wallet:', walletError);
        return NextResponse.json(
          { error: 'Failed to create wallet', details: walletError },
          { status: 500 }
        );
      }

      console.log('[AUTH] ✓ Wallet created successfully:', newWallet);
    } else {
      console.log('[AUTH] ✓ User already exists in database');
    }

    console.log('[AUTH] === AUTHENTICATION COMPLETE ===');
    console.log('[AUTH] ✓ User authenticated successfully');
    console.log('[AUTH] ✓ Session created');
    console.log('[AUTH] ✓ User data ready');

    return NextResponse.json({
      success: true,
      user,
      session,
    });

  } catch (error) {
    console.error('[AUTH] ❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
