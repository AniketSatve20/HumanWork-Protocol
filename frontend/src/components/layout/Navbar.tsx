import { useState, useEffect } from 'react';
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
  Award,
  Scale,
  Sparkles,
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!isProfileDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-profile-dropdown]')) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [isProfileDropdownOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  }, [location.pathname]);

  const navLinks = isAuthenticated
    ? [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/jobs', label: 'Jobs', icon: Briefcase },
        { href: '/search', label: 'Search', icon: Search },
        { href: '/skills', label: 'Skills', icon: Award },
        { href: '/disputes', label: 'Disputes', icon: Scale },
        { href: '/messages', label: 'Messages', icon: MessageSquare, badge: unreadCount },
      ]
    : [];

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
      scrolled
        ? 'bg-[#0D0D0D]/95 backdrop-blur-2xl border-b border-[#FFB800]/10 shadow-lg shadow-black/30'
        : 'bg-[#0D0D0D]/40 backdrop-blur-md border-b border-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo — brutalist square */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="w-9 h-9 border border-[#FFB800]/25 bg-[#FFB800]/5 flex items-center justify-center group-hover:border-[#FFB800]/40 group-hover:shadow-[0_0_15px_rgba(255,184,0,0.1)] transition-all duration-300"
            >
              <span className="text-[#FFB800] font-bold text-base font-display">H</span>
            </motion.div>
            <span className="hidden sm:block font-display font-bold text-lg text-white tracking-tight">
              Human<span className="text-[#FFB800]">Work</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'relative flex items-center gap-2 px-3.5 py-2 text-sm font-medium transition-all duration-200 group',
                  isActive(link.href)
                    ? 'text-[#FFB800]'
                    : 'text-[#737892] hover:bg-[#1A1A1A]/60 hover:text-white'
                )}
              >
                <link.icon className={cn(
                  'w-4 h-4 transition-colors icon-depth',
                  isActive(link.href) ? 'text-[#FFB800]' : 'text-[#00F0FF] group-hover:text-white/70'
                )} />
                {link.label}
                {link.badge ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-[#00F0FF] text-black min-w-[18px] text-center"
                  >
                    {link.badge > 9 ? '9+' : link.badge}
                  </motion.span>
                ) : null}
                {/* Active indicator — angular underline */}
                {isActive(link.href) && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-x-0 -bottom-px h-[2px] bg-[#FFB800]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                {/* Notifications */}
                <Link
                  to="/messages"
                  className="relative p-2.5 text-[#737892] hover:bg-[#1A1A1A]/60 hover:text-white transition-all duration-200"
                >
                  <Bell className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1 w-4 h-4 bg-[#FFB800] text-black text-[9px] font-bold flex items-center justify-center ring-2 ring-[#0D0D0D]"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </Link>

                {/* Profile Dropdown */}
                <div className="relative" data-profile-dropdown>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className={cn(
                      'flex items-center gap-2 p-1.5 transition-all duration-200',
                      isProfileDropdownOpen
                        ? 'bg-[#1A1A1A]/60'
                        : 'hover:bg-[#1A1A1A]/40'
                    )}
                  >
                    <img
                      src={user.avatar || generateAvatar(address || '')}
                      alt={user.name}
                      className="w-7 h-7 ring-2 ring-[#FFB800]/20"
                    />
                    <span className="hidden sm:block text-sm font-medium text-white/80 max-w-[100px] truncate">
                      {user.name || formatAddress(address || '')}
                    </span>
                    <ChevronDown className={cn(
                      'w-3.5 h-3.5 text-[#737892] transition-transform duration-200',
                      isProfileDropdownOpen && 'rotate-180'
                    )} />
                  </button>

                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute right-0 mt-2 w-60 bg-[#0D0D0D]/95 backdrop-blur-2xl shadow-2xl border border-[#FFB800]/15 py-1.5 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-[#FFB800]/10">
                          <p className="font-semibold text-white text-sm">{user.name}</p>
                          <p className="text-xs text-[#00F0FF] mt-0.5 font-mono">{formatAddress(address || '')}</p>
                          <span className={cn(
                            'inline-flex items-center gap-1 mt-2 text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wider',
                            user.role === 'freelancer'
                              ? 'bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20'
                              : 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20'
                          )}>
                            <Sparkles className="w-2.5 h-2.5" />
                            {user.role === 'freelancer' ? 'Freelancer' : 'Recruiter'}
                          </span>
                        </div>

                        <div className="py-1">
                          <Link
                            to="/profile"
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#a0a4ba] hover:bg-[#1A1A1A]/50 hover:text-white transition-colors"
                          >
                            <User className="w-4 h-4 text-[#00F0FF]" />
                            View Profile
                          </Link>
                          <Link
                            to="/settings"
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#a0a4ba] hover:bg-[#1A1A1A]/50 hover:text-white transition-colors"
                          >
                            <Settings className="w-4 h-4 text-[#00F0FF]" />
                            Settings
                          </Link>
                        </div>

                        <div className="border-t border-[#FFB800]/10 pt-1">
                          <button
                            onClick={() => {
                              disconnect();
                              setIsProfileDropdownOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[#f87171] hover:bg-[#f87171]/5 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Disconnect Wallet
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <motion.button
                onClick={connect}
                disabled={isConnecting}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="bg-[#FFB800] text-black font-semibold px-5 py-2.5 text-sm hover:shadow-[0_0_25px_rgba(255,184,0,0.25)] transition-all duration-300 inline-flex items-center gap-2"
              >
                <Wallet className="w-4 h-4 icon-glow" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </motion.button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2.5 text-[#737892] hover:bg-[#1A1A1A]/50 transition-colors"
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu — brutalist panel */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[-1]"
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden bg-[#0D0D0D]/95 backdrop-blur-2xl border-t border-[#FFB800]/10"
            >
              <div className="px-4 py-4 space-y-1">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all',
                        isActive(link.href)
                          ? 'bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/10'
                          : 'text-[#737892] hover:bg-[#1A1A1A]/50 hover:text-white'
                      )}
                    >
                      <link.icon className="w-5 h-5" />
                      {link.label}
                      {link.badge ? (
                        <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-[#FFB800] text-black">
                          {link.badge}
                        </span>
                      ) : null}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default Navbar;
