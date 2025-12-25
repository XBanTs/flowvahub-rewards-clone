import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { useRewards } from '../hooks/useRewards';
import { useClaimReward } from '../hooks/useClaimReward';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { RewardCard } from '../components/RewardCard';
import { ClaimModal } from '../components/ClaimModal';
import { AuthPage } from './AuthPage';
import type { RewardWithStatus } from '../types';

const ITEMS_PER_PAGE = 12;

export function RewardsPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(user?.id);
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [selectedReward, setSelectedReward] = useState<RewardWithStatus | null>(null);

  // Memoize filter options to prevent unnecessary re-renders
  const filterOptions = useMemo(() => ({
    search: search || undefined,
    category: category || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  }), [search, category, page]);

  const { rewards, loading: rewardsLoading, error: rewardsError, refetch, total } = useRewards(
    user?.id, 
    filterOptions
  );
  
  const { claimReward, loading: claiming, error: claimError } = useClaimReward();

  const isLoading = authLoading || profileLoading || rewardsLoading;

  // Memoized handlers
  const handleClaimClick = useCallback((reward: RewardWithStatus) => {
    setSelectedReward(reward);
  }, []);

  const handleCancelModal = useCallback(() => {
    setSelectedReward(null);
  }, []);

  const handleConfirmClaim = useCallback(async () => {
    if (!selectedReward) return;

    const success = await claimReward(selectedReward.id, selectedReward.title);
    if (success) {
      setSelectedReward(null);
      refetch();
    }
  }, [selectedReward, claimReward, refetch]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset page when search changes - this is in event handler, not effect
  }, []);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setPage(1); // Reset page when category changes - this is in event handler, not effect
  }, []);

  const handlePrevPage = useCallback(() => {
    setPage(p => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage(p => p + 1);
  }, []);

  // Early returns for auth/loading states
  if (authLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <AuthPage onAuthSuccess={() => window.location.reload()} />;
  if (isLoading) return <LoadingSpinner />;
  if (profileError) return <ErrorMessage error={profileError} />;
  if (rewardsError) return <ErrorMessage error={rewardsError} onRetry={refetch} />;

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const userPoints = profile?.points_balance ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Points Balance */}
      <div className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-6">
        <p className="text-white/80 text-sm mb-1">Your Points</p>
        <p className="text-4xl font-bold">{userPoints.toLocaleString()}</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Search rewards..."
            value={search}
            onChange={handleSearchChange}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={category}
            onChange={handleCategoryChange}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            <option value="gift_card">Gift Cards</option>
            <option value="subscription">Subscriptions</option>
            <option value="physical">Physical Items</option>
            <option value="voucher">Vouchers</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {claimError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {claimError}
        </div>
      )}

      {rewards.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {rewards.map(reward => (
              <RewardCard
                key={reward.id}
                reward={reward}
                userPoints={userPoints}
                onClaim={handleClaimClick}
                showShare={true}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedReward && (
        <ClaimModal
          reward={selectedReward}
          onConfirm={handleConfirmClaim}
          onCancel={handleCancelModal}
          loading={claiming}
        />
      )}
    </div>
  );
}