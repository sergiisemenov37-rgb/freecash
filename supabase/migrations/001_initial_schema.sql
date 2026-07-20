-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  coins_balance BIGINT DEFAULT 0,
  usdt_balance DECIMAL(18, 6) DEFAULT 0,
  energy INTEGER DEFAULT 1000,
  max_energy INTEGER DEFAULT 1000,
  referral_code VARCHAR(20) UNIQUE,
  referred_by VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table
CREATE TABLE profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  bio TEXT,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table
CREATE TABLE wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  wallet_address TEXT,
  balance DECIMAL(18, 6) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USDT',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- 'tap', 'withdrawal', 'deposit', 'referral', 'reward'
  amount DECIMAL(18, 6) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDT',
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = telegram_id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = telegram_id::text);

CREATE POLICY "Service role can do everything" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = profiles.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = profiles.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Service role can do everything" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for wallets
CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = wallets.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Users can update own wallet" ON wallets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = wallets.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Service role can do everything" ON wallets
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = transactions.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Service role can do everything" ON transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
