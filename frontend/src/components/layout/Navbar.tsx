import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Wallet,
  Bell,
  MessageSquare,
  User,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Briefcase,
  Search,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/context/authStore';
import { useMessagesStore } from '@/context/messagesStore';
import { formatAddress, generateAvatar, cn } from '@/utils/helpers';

export function Navbar() {
  const location = useLocation();
  const { user, address, isAuthenticated, isConnecting, connect, disconnect } = useAuthStore();
  const { unreadCount } = useMessagesStore();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const navLinks = isAuthenticated
    ? [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/jobs', label: 'Jobs', icon: Briefcase },
        { href: '/search', label: 'Search', icon: Search },
        { href: '/messages', label: 'Messages', icon: MessageSquare, badge: unreadCount },
      ]
    : [];

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-surface-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <span className="text-white font-bold text-lg font-display">H</span>
            </div>
            <span className="hidden sm:block font-display font-bold text-xl text-surface-900">
              HumanWork
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive(link.href)
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
                {link.badge ? (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-accent-500 text-white rounded-full">
                    {link.badge > 9 ? '9+' : link.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                {/* Notifications */}
                <button className="btn-icon btn-ghost relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </button>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-100 transition-colors"
                  >
                    <img
                      src={user.avatar || generateAvatar(address || '')}
                      alt={user.name}
                      className="w-8 h-8 rounded-full ring-2 ring-primary-100"
                    />
                    <span className="hidden sm:block text-sm font-medium text-surface-700">
                      {user.name || formatAddress(address || '')}
                    </span>
                    <ChevronDown className={cn(
                      'w-4 h-4 text-surface-400 transition-transform',
                      isProfileDropdownOpen && 'rotate-180'
                    )} />
                  </button>

                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-surface-200 py-2 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-surface-100">
                          <p className="font-medium text-surface-900">{user.name}</p>
                          <p className="text-sm text-surface-500">{formatAddress(address || '')}</p>
                          <span className={cn(
                            'inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full',
                            user.role === 'freelancer' ? 'bg-primary-100 text-primary-700' : 'bg-accent-100 text-accent-700'
                          )}>
                            {user.role === 'freelancer' ? 'Freelancer' : 'Recruiter'}
                          </span>
                        </div>

                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                          >
                            <User className="w-4 h-4" />
                            View Profile
                          </Link>
                          <Link
                            to="/settings"
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                            Settings
                          </Link>
                        </div>

                        <div className="border-t border-surface-100 pt-1">
                          <button
                            onClick={() => {
                              disconnect();
                              setIsProfileDropdownOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-error-500 hover:bg-error-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Disconnect
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="btn-primary"
              >
                <Wallet className="w-4 h-4" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden btn-icon btn-ghost"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-surface-200"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    isActive(link.href)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-surface-600 hover:bg-surface-100'
                  )}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                  {link.badge ? (
                    <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-accent-500 text-white rounded-full">
                      {link.badge}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default Navbar;
