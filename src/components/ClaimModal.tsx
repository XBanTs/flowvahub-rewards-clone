import type { RewardWithStatus } from '../types';

interface ClaimModalProps {
  reward: RewardWithStatus;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function ClaimModal({ reward, onConfirm, onCancel, loading }: ClaimModalProps) {
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