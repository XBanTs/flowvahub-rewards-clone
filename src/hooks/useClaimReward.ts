import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { sendClaimNotification } from '../utils/email';
import type { ClaimRewardResponse } from '../types';

export function useClaimReward() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimReward = async (rewardId: string, rewardTitle?: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('claim_reward', { reward_uuid: rewardId });

      if (rpcError) throw rpcError;

      const response = data as ClaimRewardResponse | null;

      if (!response || !response.success) {
        setError(response?.error || 'Failed to claim reward');
        return false;
      }

      // Send email notification
      const { data: user } = await supabase.auth.getUser();
      if (user.user?.email && rewardTitle) {
        sendClaimNotification(user.user.email, rewardTitle);
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { claimReward, loading, error };
}