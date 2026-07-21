-- Game Features Migration
-- Adds tables for boosts, daily rewards, missions, and game state tracking

-- Update users table with game-related fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_energy_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS total_taps BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS coins_per_tap INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS energy_regen_rate INTEGER DEFAULT 1; -- energy per minute

-- Boosts table
CREATE TABLE IF NOT EXISTS user_boosts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  boost_type VARCHAR(50) NOT NULL, -- 'x2_coins', 'auto_tap', 'energy_upgrade', 'critical_hit'
  level INTEGER DEFAULT 1,
  max_level INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE, -- for temporary boosts
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, boost_type)
);

-- Daily rewards table
CREATE TABLE IF NOT EXISTS daily_rewards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  streak INTEGER DEFAULT 0,
  last_claim TIMESTAMP WITH TIME ZONE,
  total_claims INTEGER DEFAULT 0,
  claim_history JSONB DEFAULT '[]', -- array of claim dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Missions table
CREATE TABLE IF NOT EXISTS missions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mission_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'achievement'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  requirement_type VARCHAR(50) NOT NULL, -- 'taps', 'coins', 'invites', 'daily_reward', 'boost_purchase'
  requirement_target INTEGER NOT NULL,
  reward_coins INTEGER DEFAULT 0,
  reward_usdt DECIMAL(18, 6) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User mission progress table
CREATE TABLE IF NOT EXISTS user_missions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  is_claimed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

-- Auto-tap jobs table (for server-side auto-tap)
CREATE TABLE IF NOT EXISTS auto_tap_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  taps_per_minute INTEGER DEFAULT 10,
  last_run TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_boosts_user_id ON user_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boosts_type ON user_boosts(boost_type);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_id ON daily_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_last_claim ON daily_rewards(last_claim);
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_missions_active ON missions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission_id ON user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_completed ON user_missions(is_completed);
CREATE INDEX IF NOT EXISTS idx_auto_tap_jobs_user_id ON auto_tap_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_tap_jobs_active ON auto_tap_jobs(is_active);

-- Enable RLS
ALTER TABLE user_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_tap_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_boosts
CREATE POLICY "Users can view own boosts" ON user_boosts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_boosts.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Users can insert own boosts" ON user_boosts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_boosts.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Users can update own boosts" ON user_boosts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_boosts.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Service role can do everything on user_boosts" ON user_boosts
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for daily_rewards
CREATE POLICY "Users can view own daily rewards" ON daily_rewards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = daily_rewards.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Users can insert own daily rewards" ON daily_rewards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = daily_rewards.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Users can update own daily rewards" ON daily_rewards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = daily_rewards.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Service role can do everything on daily_rewards" ON daily_rewards
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for missions
CREATE POLICY "Everyone can view active missions" ON missions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can do everything on missions" ON missions
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_missions
CREATE POLICY "Users can view own missions" ON user_missions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_missions.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Users can insert own missions" ON user_missions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_missions.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Users can update own missions" ON user_missions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_missions.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Service role can do everything on user_missions" ON user_missions
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for auto_tap_jobs
CREATE POLICY "Users can view own auto tap jobs" ON auto_tap_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auto_tap_jobs.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Users can insert own auto tap jobs" ON auto_tap_jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auto_tap_jobs.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Users can update own auto tap jobs" ON auto_tap_jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auto_tap_jobs.user_id 
      AND auth.uid()::text = users.telegram_id::text
    )
  );

CREATE POLICY "Service role can do everything on auto_tap_jobs" ON auto_tap_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- Triggers for updated_at
CREATE TRIGGER update_user_boosts_updated_at BEFORE UPDATE ON user_boosts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_rewards_updated_at BEFORE UPDATE ON daily_rewards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_missions_updated_at BEFORE UPDATE ON user_missions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_tap_jobs_updated_at BEFORE UPDATE ON auto_tap_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default missions
INSERT INTO missions (mission_type, title, description, requirement_type, requirement_target, reward_coins) VALUES
  ('daily', 'Tap Master', 'Tap 100 times', 'taps', 100, 50),
  ('daily', 'Coin Collector', 'Earn 1000 coins', 'coins', 1000, 100),
  ('daily', 'First Boost', 'Buy your first boost', 'boost_purchase', 1, 200),
  ('daily', 'Daily Streak', 'Claim your daily reward', 'daily_reward', 1, 30),
  ('weekly', 'Tap Legend', 'Tap 1000 times', 'taps', 1000, 500),
  ('weekly', 'Coin Tycoon', 'Earn 10000 coins', 'coins', 10000, 1000),
  ('achievement', 'Tap Novice', 'Tap 1000 times total', 'taps', 1000, 200),
  ('achievement', 'Tap Expert', 'Tap 10000 times total', 'taps', 10000, 2000),
  ('achievement', 'Coin Millionaire', 'Earn 100000 coins total', 'coins', 100000, 5000)
ON CONFLICT DO NOTHING;
