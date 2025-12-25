// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Reward {
  id: string;
  title: string;
  description: string;
  points_required: number;
  image_url: string | null;
  category: string;
  is_active: boolean;
  stock_quantity: number | null;
  display_order: number;
}

export interface UserProfile {
  id: string;
  points_balance: number;
  display_name: string | null;
}

export interface RewardClaim {
  reward_id: string;
  claimed_at: string;
}

export type ClaimStatus = 'available' | 'claimed' | 'insufficient_points' | 'unavailable';

export interface RewardWithStatus extends Reward {
  claim_status: ClaimStatus;
  claimed_at?: string;
}

export interface ClaimRewardResponse {
  success: boolean;
  error?: string;
  claim_id?: string;
  new_balance?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at: string;
}