-- ============================================================================
-- FLOWVAHUB REWARDS DATABASE SCHEMA
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reward_claims ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE 1: USER PROFILES
-- ============================================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE 2: REWARDS
-- ============================================================================
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  stock_quantity INTEGER CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  max_claims_per_user INTEGER DEFAULT 1 CHECK (max_claims_per_user > 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_rewards_active ON rewards(is_active, display_order);

-- ============================================================================
-- TABLE 3: REWARD CLAIMS
-- ============================================================================
CREATE TABLE reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfillment_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (fulfillment_status IN ('pending', 'processing', 'completed', 'cancelled')),
  
  -- Prevent duplicate claims
  UNIQUE(user_id, reward_id)
);

CREATE INDEX idx_reward_claims_user ON reward_claims(user_id, claimed_at DESC);

-- ============================================================================
-- TRIGGER: AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, points_balance)
  VALUES (NEW.id, COALESCE(NEW.email, 'User'), 1000); -- 1000 starting points for demo
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- User Profiles Policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Rewards Policies
CREATE POLICY "Authenticated users can view active rewards"
  ON rewards FOR SELECT
  USING (is_active = TRUE AND auth.uid() IS NOT NULL);

-- Reward Claims Policies
CREATE POLICY "Users can view own claims"
  ON reward_claims FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- SECURE CLAIM FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION claim_reward(reward_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_points_required INTEGER;
  v_current_balance INTEGER;
  v_claim_id UUID;
  v_stock_quantity INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Lock user profile row to prevent race conditions
  SELECT points_balance INTO v_current_balance
  FROM user_profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Check reward exists and is available
  SELECT points_required, stock_quantity INTO v_points_required, v_stock_quantity
  FROM rewards
  WHERE id = reward_uuid
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reward not available');
  END IF;

  -- Check if already claimed
  IF EXISTS (
    SELECT 1 FROM reward_claims 
    WHERE user_id = v_user_id AND reward_id = reward_uuid
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already claimed');
  END IF;

  -- Check sufficient balance
  IF v_current_balance < v_points_required THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient points');
  END IF;

  -- Check stock
  IF v_stock_quantity IS NOT NULL AND v_stock_quantity <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Out of stock');
  END IF;

  -- All checks passed - execute transaction
  
  -- Deduct points
  UPDATE user_profiles
  SET points_balance = points_balance - v_points_required,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Create claim record
  INSERT INTO reward_claims (user_id, reward_id, points_spent)
  VALUES (v_user_id, reward_uuid, v_points_required)
  RETURNING id INTO v_claim_id;

  -- Decrement stock if applicable
  IF v_stock_quantity IS NOT NULL THEN
    UPDATE rewards
    SET stock_quantity = stock_quantity - 1,
        updated_at = NOW()
    WHERE id = reward_uuid;
  END IF;

  RETURN json_build_object(
    'success', true, 
    'claim_id', v_claim_id,
    'new_balance', v_current_balance - v_points_required
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION claim_reward TO authenticated;

-- ============================================================================
-- SEED DATA: SAMPLE REWARDS
-- ============================================================================
INSERT INTO rewards (title, description, points_required, category, stock_quantity, display_order, image_url) VALUES
  (
    '$10 Amazon Gift Card', 
    'Redeem for a $10 Amazon gift card to shop for anything you need',
    1000, 
    'gift_card',
    50,
    1,
    'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400&h=300&fit=crop'
  ),
  (
    'Premium Membership - 1 Month', 
    'Unlock all premium features for 30 days including advanced analytics',
    2500, 
    'subscription',
    NULL,
    2,
    'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop'
  ),
  (
    'Exclusive Sticker Pack', 
    'Limited edition sticker collection featuring unique designs',
    500, 
    'physical',
    25,
    3,
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=300&fit=crop'
  ),
  (
    '$25 Visa Gift Card', 
    'Universal gift card accepted anywhere Visa is accepted',
    2500, 
    'gift_card',
    30,
    4,
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop'
  ),
  (
    'Coffee Shop Voucher', 
    'Redeem at partner coffee shops for your favorite beverage',
    300, 
    'voucher',
    100,
    5,
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop'
  ),
  (
    'Premium Membership - 3 Months', 
    'Extended premium access with all features unlocked for 90 days',
    6000, 
    'subscription',
    NULL,
    6,
    'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=400&h=300&fit=crop'
  ),
  (
    'Wireless Earbuds', 
    'High-quality Bluetooth earbuds with noise cancellation',
    8000, 
    'physical',
    10,
    7,
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=300&fit=crop'
  ),
  (
    '$5 Starbucks Gift Card', 
    'Perfect for your morning coffee or afternoon treat',
    500, 
    'gift_card',
    75,
    8,
    'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400&h=300&fit=crop'
  );
