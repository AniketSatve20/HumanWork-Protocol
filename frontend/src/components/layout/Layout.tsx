import { Outlet, Link } from 'react-router-dom';
import { Navbar } from './Navbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-[#080808] relative flex flex-col hud-grid">
      {/* BR2049 ambient background — deep charcoal with neon glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-60 -right-60 w-[600px] h-[600px] bg-[#FFB800]/[0.015] blur-[250px]" />
        <div className="absolute -bottom-60 -left-60 w-[500px] h-[500px] bg-[#00F0FF]/[0.01] blur-[220px]" />
        {/* Precision grid — brutalist */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,184,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,184,0,0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <Navbar />
      <main className="relative z-10 pt-16 flex-1">
        <Outlet />
      </main>

      {/* Footer — brutalist */}
      <footer className="relative z-10 border-t border-[#FFB800]/10 bg-[#0D0D0D] mt-auto">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 border border-[#FFB800]/20 bg-[#FFB800]/5 flex items-center justify-center">
                <span className="text-[#FFB800] font-bold text-xs font-display">H</span>
              </div>
              <span className="font-display font-semibold text-sm text-white/80">
                Human<span className="text-[#FFB800]">Work</span>
              </span>
            </div>

            <nav className="flex items-center gap-6">
              {[
                { label: 'Jobs', href: '/jobs' },
                { label: 'Skills', href: '/skills' },
                { label: 'Disputes', href: '/disputes' },
              ].map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-xs text-[#737892] hover:text-[#FFB800] transition-colors font-medium font-mono"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <span className="text-[11px] text-[#00F0FF]/60 font-mono">Built on Hedera</span>
              <span className="text-[#2A2A2A]">|</span>
              <span className="text-[11px] text-[#00F0FF]/60 font-mono">&copy; {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
