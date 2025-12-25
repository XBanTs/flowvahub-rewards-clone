import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import type { Reward, RewardClaim } from '../types';

interface RewardHistoryItem extends RewardClaim {
  reward: Reward;
}

export function useRewardHistory(userId: string | undefined) {
  const [history, setHistory] = useState<RewardHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('reward_claims')
          .select(`
            reward_id,
            claimed_at,
            rewards (
              id,
              title,
              description,
              points_required,
              image_url,
              category
            )
          `)
          .eq('user_id', userId)
          .order('claimed_at', { ascending: false });

        if (error) throw error;

        const historyItems: RewardHistoryItem[] = data.map((item: any) => ({
          reward_id: item.reward_id,
          claimed_at: item.claimed_at,
          reward: item.rewards,
        }));

        setHistory(historyItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  return { history, loading, error };
}