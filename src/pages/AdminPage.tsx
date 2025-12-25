import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AuthPage } from './AuthPage';
import type { Reward } from '../types';

export function AdminPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  // FIX: fetchRewards is defined BEFORE it is used in useEffect
  const fetchRewards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('display_order');
    
    if (!error && data) {
      setRewards(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRewards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleSave = async (reward: Partial<Reward>) => {
    // If we are editing an existing reward (it has an ID)
    if (editingReward?.id) {
      await supabase.from('rewards').update(reward).eq('id', editingReward.id);
    } else {
      // If we are creating a new reward
      await supabase.from('rewards').insert([reward]);
    }
    setEditingReward(null);
    fetchRewards();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this reward?')) {
      await supabase.from('rewards').delete().eq('id', id);
      fetchRewards();
    }
  };

  if (authLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <AuthPage onAuthSuccess={() => window.location.reload()} />;
  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <button
          onClick={() =>
            setEditingReward({
              id: '',
              title: '',
              description: '',
              points_required: 0,
              category: 'general',
              is_active: true,
              stock_quantity: null,
              display_order: 0,
              image_url: null,
            })
          }
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Add New Reward
        </button>
      </div>

      {rewards.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">
            No rewards yet. Create your first reward!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rewards.map((reward) => (
                  <tr key={reward.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {reward.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {reward.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reward.points_required.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {reward.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reward.stock_quantity ?? 'Unlimited'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          reward.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {reward.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setEditingReward(reward)}
                        className="text-blue-600 hover:text-blue-900 mr-4 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(reward.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

function RewardForm({
  reward,
  onSave,
  onCancel,
}: {
  reward: Partial<Reward>;
  onSave: (r: Partial<Reward>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Reward>>(reward);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-gray-800 mb-6">
          {reward.id ? 'Edit Reward' : 'Add New Reward'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g., $10 Amazon Gift Card"
              value={formData.title || ''}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              placeholder="Detailed description of the reward..."
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points Required
              </label>
              <input
                type="number"
                placeholder="1000"
                value={formData.points_required || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    points_required: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category || 'general'}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="gift_card">Gift Card</option>
                <option value="subscription">Subscription</option>
                <option value="physical">Physical Item</option>
                <option value="voucher">Voucher</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                placeholder="Leave empty for unlimited"
                value={formData.stock_quantity || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stock_quantity: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.display_order ?? 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    display_order: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={formData.image_url || ''}
              onChange={(e) =>
                setFormData({ ...formData, image_url: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active ?? true}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="is_active"
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Active (visible to users)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {reward.id ? 'Update Reward' : 'Create Reward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}