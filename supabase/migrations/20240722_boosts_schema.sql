-- Boosts table for available boost types
CREATE TABLE IF NOT EXISTS boosts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multitap', 'energy_limit', 'recharging_speed')),
  base_cost INTEGER NOT NULL,
  cost_multiplier DECIMAL NOT NULL,
  effect_per_level DECIMAL NOT NULL,
  max_level INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User boosts table for tracking user's boost levels
CREATE TABLE IF NOT EXISTS user_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boost_id TEXT NOT NULL REFERENCES boosts(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, boost_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_boosts_user_id ON user_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boosts_boost_id ON user_boosts(boost_id);
CREATE INDEX IF NOT EXISTS idx_user_boosts_active ON user_boosts(is_active) WHERE is_active = true;

-- Insert default boost types
INSERT INTO boosts (id, name, description, icon, type, base_cost, cost_multiplier, effect_per_level, max_level) VALUES
  ('multitap', 'Multitap', 'Increase coins per tap', '👆', 'multitap', 1000, 1.5, 1, 10),
  ('energy_limit', 'Energy Limit', 'Increase max energy', '⚡', 'energy_limit', 1500, 1.6, 100, 10),
  ('recharging_speed', 'Recharging Speed', 'Faster energy recovery', '🔋', 'recharging_speed', 2000, 1.7, 0.5, 10)
ON CONFLICT (id) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_boosts_updated_at BEFORE UPDATE ON boosts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_boosts_updated_at BEFORE UPDATE ON user_boosts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
