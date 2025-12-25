export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="text-8xl mb-6">🎁</div>
      <h2 className="text-3xl font-bold text-gray-800 mb-3">No Rewards Available</h2>
      <p className="text-gray-500 text-lg">Check back soon for exciting rewards!</p>
    </div>
  );
}