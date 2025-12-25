import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Navigation() {
  const { isAuthenticated, signOut } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return null;

  const navItems = [
    { path: '/', label: 'Rewards' },
    { path: '/history', label: 'History' },
    { path: '/admin', label: 'Admin' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}