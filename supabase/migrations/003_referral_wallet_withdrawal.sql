-- Migration for Stage 8-10: Referral System, Wallet, Withdrawals

-- ============================================
-- STAGE 8: REFERRAL SYSTEM
-- ============================================

-- Referrals table to track referral relationships
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  coins_rewarded DECIMAL(20, 8) DEFAULT 0,
  usdt_rewarded DECIMAL(20, 8) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(invitee_id),
  UNIQUE(inviter_id, invitee_id)
);

-- Indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_id);
CREATE INDEX IF NOT EXISTS idx_referrals_invitee ON referrals(invitee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_created ON referrals(created_at DESC);

-- RLS for referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  USING (
    inviter_id = auth.uid() OR
    invitee_id = auth.uid()
  );

CREATE POLICY "Service role can manage referrals"
  ON referrals FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referrals_updated_at();

-- ============================================
-- STAGE 9: WALLET TRANSACTIONS
-- ============================================

-- Ensure transactions table exists with all required fields
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'tap_reward',
    'mission_reward',
    'daily_reward',
    'referral_reward',
    'withdrawal',
    'admin_adjustment',
    'conversion',
    'boost_purchase'
  )),
  amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) NOT NULL CHECK (currency IN ('COINS', 'USDT')),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN (
    'pending',
    'completed',
    'failed',
    'cancelled'
  )),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);

-- RLS for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage transactions"
  ON transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp for transactions
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- ============================================
-- STAGE 10: WITHDRAWALS
-- ============================================

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL,
  network VARCHAR(20) NOT NULL CHECK (network IN ('TON', 'SOLANA')),
  amount DECIMAL(20, 8) NOT NULL,
  fee DECIMAL(20, 8) DEFAULT 0,
  net_amount DECIMAL(20, 8) GENERATED ALWAYS AS (amount - fee) STORED,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'completed',
    'cancelled'
  )),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  transaction_hash VARCHAR(255),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for withdrawal requests
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_network ON withdrawal_requests(network);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON withdrawal_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_admin ON withdrawal_requests(admin_id);

-- RLS for withdrawal requests
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create withdrawal requests"
  ON withdrawal_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage withdrawal requests"
  ON withdrawal_requests FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp for withdrawals
CREATE OR REPLACE FUNCTION update_withdrawals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_withdrawals_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_withdrawals_updated_at();

-- ============================================
-- WITHDRAWAL CONFIGURATION
-- ============================================

-- Withdrawal configuration table
CREATE TABLE IF NOT EXISTS withdrawal_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network VARCHAR(20) NOT NULL UNIQUE CHECK (network IN ('TON', 'SOLANA')),
  min_withdrawal DECIMAL(20, 8) NOT NULL DEFAULT 1,
  max_withdrawal DECIMAL(20, 8) NOT NULL DEFAULT 10000,
  fee_percentage DECIMAL(5, 4) NOT NULL DEFAULT 0,
  fixed_fee DECIMAL(20, 8) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default withdrawal configurations
INSERT INTO withdrawal_config (network, min_withdrawal, max_withdrawal, fee_percentage, fixed_fee)
VALUES 
  ('TON', 1, 10000, 0, 0.1),
  ('SOLANA', 0.1, 10000, 0, 0.005)
ON CONFLICT (network) DO NOTHING;

-- RLS for withdrawal config
ALTER TABLE withdrawal_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view withdrawal config"
  ON withdrawal_config FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage withdrawal config"
  ON withdrawal_config FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp for config
CREATE OR REPLACE FUNCTION update_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_config_updated_at
  BEFORE UPDATE ON withdrawal_config
  FOR EACH ROW
  EXECUTE FUNCTION update_config_updated_at();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate referral rewards
CREATE OR REPLACE FUNCTION calculate_referral_reward(
  p_amount DECIMAL,
  p_currency VARCHAR
) RETURNS DECIMAL AS $$
BEGIN
  RETURN p_amount * 0.05; -- 5% referral reward
END;
$$ LANGUAGE plpgsql;

-- Function to get referral statistics
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_invited', COUNT(DISTINCT invitee_id),
    'active_referrals', COUNT(DISTINCT invitee_id) FILTER (WHERE status = 'active'),
    'coins_earned', COALESCE(SUM(coins_rewarded), 0),
    'usdt_earned', COALESCE(SUM(usdt_rewarded), 0),
    'today_referrals', COUNT(DISTINCT invitee_id) FILTER (WHERE DATE(created_at) = CURRENT_DATE),
    'month_referrals', COUNT(DISTINCT invitee_id) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE))
  ) INTO v_stats
  FROM referrals
  WHERE inviter_id = p_user_id;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;
