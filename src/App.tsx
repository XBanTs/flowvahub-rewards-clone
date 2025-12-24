import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js'
import type { User, Session } from '@supabase/supabase-js'


// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Reward {
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

interface UserProfile {
  id: string;
  points_balance: number;
  display_name: string | null;
}

interface RewardClaim {
  reward_id: string;
  claimed_at: string;
}

type ClaimStatus = 'available' | 'claimed' | 'insufficient_points' | 'unavailable';

interface RewardWithStatus extends Reward {
  claim_status: ClaimStatus;
  claimed_at?: string;
}

interface ClaimRewardResponse {
  success: boolean;
  error?: string;
  claim_id?: string;
  new_balance?: number;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, isAuthenticated: !!user, signOut };
}

function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    const subscription = supabase
      .channel(`profile_${userId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${userId}` },
        (payload: { new: UserProfile }) => setProfile(payload.new)
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return { profile, loading, error };
}

function useRewards(userId: string | undefined) {
  const [rewards, setRewards] = useState<RewardWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      const [rewardsRes, claimsRes, profileRes] = await Promise.all([
        supabase.from('rewards').select('*').eq('is_active', true).order('display_order'),
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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return { rewards, loading, error, refetch: fetchRewards };
}

function determineClaimStatus(reward: Reward, userPoints: number, claimedIds: Set<string>): ClaimStatus {
  if (claimedIds.has(reward.id)) return 'claimed';
  if (reward.stock_quantity !== null && reward.stock_quantity <= 0) return 'unavailable';
  if (userPoints < reward.points_required) return 'insufficient_points';
  return 'available';
}

function useClaimReward() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimReward = async (rewardId: string): Promise<boolean> => {
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

// ============================================================================
// UI COMPONENTS
// ============================================================================

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        <p className="mt-4 text-gray-600 font-medium">Loading rewards...</p>
      </div>
    </div>
  );
}

function ErrorMessage({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="text-8xl mb-6">🎁</div>
      <h2 className="text-3xl font-bold text-gray-800 mb-3">No Rewards Available</h2>
      <p className="text-gray-500 text-lg">Check back soon for exciting rewards!</p>
    </div>
  );
}

function RewardsHeader({ profile, onSignOut }: { profile: UserProfile | null; onSignOut: () => void }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">Rewards</h1>
          <button
            onClick={onSignOut}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
          >
            Sign Out
          </button>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 inline-block">
          <p className="text-white/80 text-sm mb-1">Your Points</p>
          <p className="text-5xl font-bold">{profile?.points_balance.toLocaleString() ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

function ClaimModal({ 
  reward, 
  onConfirm, 
  onCancel, 
  loading 
}: { 
  reward: RewardWithStatus; 
  onConfirm: () => void; 
  onCancel: () => void; 
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Confirm Claim</h3>
        <div className="mb-6">
          <p className="text-gray-600 mb-2">You're about to claim:</p>
          <p className="text-xl font-semibold text-gray-800">{reward.title}</p>
          <p className="text-blue-600 font-bold text-lg mt-2">
            Cost: {reward.points_required.toLocaleString()} points
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Claim Reward'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function RewardCard({ 
  reward, 
  userPoints, 
  onClaim 
}: { 
  reward: RewardWithStatus; 
  userPoints: number;
  onClaim: (reward: RewardWithStatus) => void;
}) {
  const getStatusBadge = () => {
    switch (reward.claim_status) {
      case 'claimed':
        return <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">✓ Claimed</span>;
      case 'insufficient_points':
        return <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 text-sm font-semibold rounded-full">Need {(reward.points_required - userPoints).toLocaleString()} more</span>;
      case 'unavailable':
        return <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-full">Out of Stock</span>;
      default:
        return null;
    }
  };

  const canClaim = reward.claim_status === 'available';

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative h-48 bg-gradient-to-br from-blue-400 to-purple-500">
        {reward.image_url ? (
          <img src={reward.image_url} alt={reward.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-white text-6xl">
            🎁
          </div>
        )}
        {reward.stock_quantity !== null && (
          <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
            {reward.stock_quantity} left
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-800 flex-1">{reward.title}</h3>
          {getStatusBadge()}
        </div>
        
        <p className="text-gray-600 mb-4 line-clamp-2">{reward.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">
            {reward.points_required.toLocaleString()} pts
          </div>
          
          <button
            onClick={() => onClaim(reward)}
            disabled={!canClaim}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-colors ${
              canClaim
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {reward.claim_status === 'claimed' ? 'Claimed' : 'Claim'}
          </button>
        </div>
        
        {reward.claimed_at && (
          <p className="text-sm text-gray-500 mt-3">
            Claimed on {new Date(reward.claimed_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

function RewardsList({ 
  rewards, 
  userPoints, 
  onClaimSuccess 
}: { 
  rewards: RewardWithStatus[]; 
  userPoints: number;
  onClaimSuccess: () => void;
}) {
  const [selectedReward, setSelectedReward] = useState<RewardWithStatus | null>(null);
  const { claimReward, loading: claiming, error: claimError } = useClaimReward();

  const handleClaimClick = (reward: RewardWithStatus) => {
    setSelectedReward(reward);
  };

  const handleConfirmClaim = async () => {
    if (!selectedReward) return;

    const success = await claimReward(selectedReward.id);
    if (success) {
      setSelectedReward(null);
      onClaimSuccess();
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {claimError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {claimError}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map(reward => (
            <RewardCard
              key={reward.id}
              reward={reward}
              userPoints={userPoints}
              onClaim={handleClaimClick}
            />
          ))}
        </div>
      </div>

      {selectedReward && (
        <ClaimModal
          reward={selectedReward}
          onConfirm={handleConfirmClaim}
          onCancel={() => setSelectedReward(null)}
          loading={claiming}
        />
      )}
    </>
  );
}

// ============================================================================
// AUTH COMPONENT
// ============================================================================

function AuthPage({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        onAuthSuccess();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-gray-600 mb-8">
          {isSignUp ? 'Sign up to start earning rewards' : 'Sign in to view your rewards'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              isSignUp ? 'Sign Up' : 'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

function RewardsPage() {
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(user?.id);
  const { rewards, loading: rewardsLoading, error: rewardsError, refetch } = useRewards(user?.id);

  const isLoading = authLoading || profileLoading || rewardsLoading;

  if (authLoading) return <LoadingSpinner />;
  
  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => window.location.reload()} />;
  }

  if (isLoading) return <LoadingSpinner />;
  if (profileError) return <ErrorMessage error={profileError} />;
  if (rewardsError) return <ErrorMessage error={rewardsError} onRetry={refetch} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <RewardsHeader profile={profile} onSignOut={signOut} />
      
      {rewards.length === 0 ? (
        <EmptyState />
      ) : (
        <RewardsList 
          rewards={rewards} 
          userPoints={profile?.points_balance ?? 0}
          onClaimSuccess={refetch}
        />
      )}
    </div>
  );
}

// ============================================================================
// APP ROOT
// ============================================================================

export default function App() {
  return <RewardsPage />;
}