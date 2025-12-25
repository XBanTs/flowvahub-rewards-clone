import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import type { Reward, RewardClaim, RewardWithStatus } from '../types';

function determineClaimStatus(reward: Reward, userPoints: number, claimedIds: Set<string>): RewardWithStatus['claim_status'] {
  if (claimedIds.has(reward.id)) return 'claimed';
  if (reward.stock_quantity !== null && reward.stock_quantity <= 0) return 'unavailable';
  if (userPoints < reward.points_required) return 'insufficient_points';
  return 'available';
}

export function useRewards(userId: string | undefined, filters?: { search?: string; category?: string; page?: number; limit?: number }) {
  const [rewards, setRewards] = useState<RewardWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchRewards = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      let query = supabase.from('rewards').select('*', { count: 'exact' }).eq('is_active', true);

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      query = query.order('display_order');

      if (filters?.limit) {
        const offset = ((filters.page || 1) - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const [rewardsRes, claimsRes, profileRes] = await Promise.all([
        query,
        supabase.from('reward_claims').select('reward_id, claimed_at').eq('user_id', userId),
        supabase.from('user_profiles').select('points_balance').eq('id', userId).single(),
      ]);

      if (rewardsRes.error) throw rewardsRes.error;
      if (claimsRes.error) throw claimsRes.error;
      if (profileRes.error) throw profileRes.error;

      const claimedIds = new Set(claimsRes.data.map((c: RewardClaim) => c.reward_id));
      const userPoints = profileRes.data.points_balance;

      const rewardsWithStatus: RewardWithStatus[] = rewardsRes.data.map((reward: Reward) => ({
        ...reward,
        claim_status: determineClaimStatus(reward, userPoints, claimedIds),
        claimed_at: claimsRes.data.find((c: RewardClaim) => c.reward_id === reward.id)?.claimed_at,
      }));

      setRewards(rewardsWithStatus);
      setTotal(rewardsRes.count || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
    } finally {
      setLoading(false);
    }
  }, [userId, filters]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return { rewards, loading, error, refetch: fetchRewards, total };
}