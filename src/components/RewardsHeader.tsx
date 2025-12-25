import type { UserProfile } from '../types';

interface RewardsHeaderProps {
  profile: UserProfile | null;
  onSignOut: () => void;
}

export function RewardsHeader({ profile, onSignOut }: RewardsHeaderProps) {
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