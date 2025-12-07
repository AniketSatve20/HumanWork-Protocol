import { Link, useLocation } from 'react-router-dom';
import { useWalletStore } from '../../stores/walletStore';

export function Navbar() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWalletStore();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/skills', label: 'Skill Tests' },
    { to: '/projects', label: 'Projects' },
    { to: '/dashboard', label: 'Dashboard' },
  ];

  const shortenAddress = (addr: string) => 
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg" />
              <span className="font-bold text-xl text-gray-900">HumanWork</span>
            </Link>
            
            <div className="hidden md:flex ml-10 space-x-4">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            {isConnected ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {shortenAddress(address!)}
                </span>
                <button
                  onClick={disconnect}
                  className="btn btn-secondary text-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="btn btn-primary"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
