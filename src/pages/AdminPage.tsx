import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AuthPage } from './AuthPage';
import type { Reward } from '../types';

export function AdminPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  if (authLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <AuthPage onAuthSuccess={() => window.location.reload()} />;

  // For simplicity, assume all authenticated users are admins
  // In a real app, you'd check user roles

  const fetchRewards = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rewards').select('*').order('display_order');
    if (!error) setRewards(data || []);
    setLoading(false);
  };

  const handleSave = async (reward: Partial<Reward>) => {
    if (editingReward) {
      await supabase.from('rewards').update(reward).eq('id', editingReward.id);
    } else {
      await supabase.from('rewards').insert(reward);
    }
    setEditingReward(null);
    fetchRewards();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('rewards').delete().eq('id', id);
    fetchRewards();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

      <div className="mb-8">
        <button
          onClick={() => setEditingReward({} as Reward)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          Add New Reward
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rewards.map((reward) => (
              <tr key={reward.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reward.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reward.points_required}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reward.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reward.stock_quantity || 'Unlimited'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setEditingReward(reward)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingReward && (
        <RewardForm
          reward={editingReward}
          onSave={handleSave}
          onCancel={() => setEditingReward(null)}
        />
      )}
    </div>
  );
}

function RewardForm({ reward, onSave, onCancel }: { reward: Partial<Reward>; onSave: (r: Partial<Reward>) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState(reward);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">
          {reward.id ? 'Edit Reward' : 'Add Reward'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Title"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            required
          />
          <textarea
            placeholder="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="number"
            placeholder="Points Required"
            value={formData.points_required || ''}
            onChange={(e) => setFormData({ ...formData, points_required: Number(e.target.value) })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="text"
            placeholder="Category"
            value={formData.category || ''}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            required
          />
          <input
            type="number"
            placeholder="Stock Quantity (leave empty for unlimited)"
            value={formData.stock_quantity || ''}
            onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value ? Number(e.target.value) : null })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}