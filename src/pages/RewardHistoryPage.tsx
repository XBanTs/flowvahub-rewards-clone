import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { useRewardHistory } from '../hooks/useRewardHistory';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { RewardCard } from '../components/RewardCard';
import { AuthPage } from './AuthPage';
import type { RewardWithStatus } from '../types';

export function RewardHistoryPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { profile } = useUserProfile(user?.id);
  const { history, loading, error } = useRewardHistory(user?.id);

  if (authLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <AuthPage onAuthSuccess={() => window.location.reload()} />;

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  const historyRewards: RewardWithStatus[] = history.map(item => ({
    ...item.reward,
    claim_status: 'claimed',
    claimed_at: item.claimed_at,
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">My Reward History</h2>

      {historyRewards.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {historyRewards.map(reward => (
            <RewardCard
              key={reward.id}
              reward={reward}
              userPoints={profile?.points_balance ?? 0}
              onClaim={() => {}}
              showShare={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}