import type { RewardWithStatus } from '../types';

interface RewardCardProps {
  reward: RewardWithStatus;
  userPoints: number;
  onClaim: (reward: RewardWithStatus) => void;
  showShare?: boolean;
}

export function RewardCard({ reward, userPoints, onClaim, showShare = false }: RewardCardProps) {
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

          <div className="flex gap-2">
            {showShare && reward.claim_status === 'claimed' && (
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `I claimed ${reward.title}!`,
                      text: `I just claimed ${reward.title} on FlowvaHub Rewards!`,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(`${window.location.href} - I claimed ${reward.title}!`);
                    alert('Link copied to clipboard!');
                  }
                }}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Share
              </button>
            )}

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