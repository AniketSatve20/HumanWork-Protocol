import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/helpers';

/* ═══════════════════════════════════════════════════════════════════
   Common UI Components — Westworld Delos Terminal Aesthetic
   Palette: Delos Gold, Mesa Slate, Obsidian, Aluminum
   All corners: 0px–2px (sharp). Clinical precision.
   ═══════════════════════════════════════════════════════════════════ */

// ── Button ──────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      accent: 'btn-accent',
      ghost: 'btn-ghost',
      outline: 'btn-outline',
      danger: 'btn-danger',
    };

    const sizes = {
      sm: 'btn-sm',
      md: '',
      lg: 'btn-lg',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
        className={cn('btn', variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...(props as any)}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

// ── Input ───────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-mono font-medium text-surface-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn('input', icon ? 'pl-10' : '', error && 'input-error', className)}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-error-400 flex items-center gap-1 font-mono text-xs">{error}</p>}
        {helperText && !error && <p className="text-sm text-surface-500 font-mono text-xs">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ── Textarea ────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-mono font-medium text-surface-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn('input min-h-[120px] resize-none', error && 'input-error', className)}
          {...props}
        />
        {error && <p className="text-sm text-error-400 font-mono text-xs">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ── Card ────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, gradient, onClick }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ duration: 0.2 }}
      className={cn(
        'delos-card',
        'bg-transparent',
        'border border-delos-grey border-[0.5px]',
        'rounded-none',
        'shadow-none',
        gradient && 'bg-gradient-to-b from-delos-grey/10 to-transparent',
        hover && 'hover:border-host-orange hover:shadow-[0_0_8px_1px_#FA831B55] hover:text-bone transition-all duration-200 cursor-pointer',
        'text-delos-grey',
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ── Badge — Delos Terminal tags ─────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'dispute' | 'verified';
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = 'primary', className, dot }: BadgeProps) {
  const variantStyles = {
    primary:  'bg-delos/10 text-delos border-delos/20',
    accent:   'bg-mesa/10 text-mesa border-mesa/20',
    success:  'bg-success-500/10 text-success-400 border-success-500/20',
    warning:  'bg-warning-500/10 text-warning-400 border-warning-500/20',
    error:    'bg-error-500/10 text-error-400 border-error-500/20',
    dispute:  'bg-[#8B0000]/10 text-[#8B0000] border-[#8B0000]/25',
    verified: 'bg-[#2A9D8F]/10 text-[#2A9D8F] border-[#2A9D8F]/25',
  };

  const dotColors = {
    primary:  'bg-delos',
    accent:   'bg-mesa',
    success:  'bg-success-400',
    warning:  'bg-warning-400',
    error:    'bg-error-400',
    dispute:  'bg-[#8B0000]',
    verified: 'bg-[#2A9D8F]',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border',
      variantStyles[variant],
      className
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────
interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: 'online' | 'offline' | 'busy';
}

export function Avatar({ src, alt, size = 'md', className, status }: AvatarProps) {
  const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  const statusColors = {
    online: 'bg-success-400',
    offline: 'bg-surface-500',
    busy: 'bg-error-400',
  };

  return (
    <div className="relative inline-flex">
      <img
        src={src || `https://api.dicebear.com/7.x/identicon/svg?seed=${alt}`}
        alt={alt}
        className={cn(sizes[size], 'object-cover', className)}
      />
      {status && (
        <span className={cn(
          'absolute bottom-0 right-0 ring-2 ring-obsidian',
          statusSizes[size],
          statusColors[status]
        )} />
      )}
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect';
}

export function Skeleton({ className, variant = 'rect' }: SkeletonProps) {
  return (
    <div className={cn(
      'animate-pulse bg-[#1A1A1A]',
      variant === 'circle' && 'rounded-full',
      className
    )} />
  );
}

// ── Spinner ─────────────────────────────────────────────────────────
export function Spinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return <Loader2 className={cn('animate-spin text-delos', sizes[size], className)} />;
}

// ── Divider ─────────────────────────────────────────────────────────
interface DividerProps {
  className?: string;
  label?: string;
  vertical?: boolean;
}

export function Divider({ className, label, vertical }: DividerProps) {
  if (vertical) return <div className={cn('w-px bg-aluminum/10 self-stretch', className)} />;
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="h-px bg-aluminum/10 flex-1" />
        <span className="text-xs font-mono font-medium text-surface-500 uppercase tracking-wider">{label}</span>
        <div className="h-px bg-aluminum/10 flex-1" />
      </div>
    );
  }
  return <div className={cn('h-px bg-aluminum/10', className)} />;
}

// ── Tabs — Angular underline variant ────────────────────────────────
interface TabsProps {
  tabs: { key: string; label: string; icon?: React.ReactNode; badge?: number }[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
  variant?: 'pills' | 'underline';
}

export function Tabs({ tabs, activeTab, onChange, className, variant = 'pills' }: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className={cn('flex gap-0 border-b border-aluminum/10', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'relative px-4 py-3 text-sm font-medium transition-all duration-200',
              activeTab === tab.key
                ? 'text-delos'
                : 'text-surface-500 hover:text-ivory'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-delos text-obsidian min-w-[18px] text-center">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
            {activeTab === tab.key && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-delos"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-1 bg-surface-100 p-1 w-fit', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200',
            activeTab === tab.key
              ? 'text-ivory'
              : 'text-surface-500 hover:text-ivory'
          )}
        >
          {activeTab === tab.key && (
            <motion.div
              layoutId="tab-pill"
              className="absolute inset-0 bg-delos/10 border border-delos/20"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-delos text-obsidian min-w-[18px] text-center">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Tooltip ─────────────────────────────────────────────────────────
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
  side?: 'top' | 'bottom';
}

export function Tooltip({ children, content, className, side = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute left-1/2 -translate-x-1/2 px-2.5 py-1.5 text-xs font-mono font-medium',
              'bg-surface-50 text-ivory border border-delos/15',
              'whitespace-nowrap z-50 pointer-events-none',
              side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            )}
          >
            {content}
            <div className={cn(
              'absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-50 rotate-45 border-delos/15',
              side === 'top' ? 'top-full -mt-1 border-b border-r border-delos/15' : 'bottom-full -mb-1 border-t border-l border-delos/15'
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── EmptyState ──────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      {icon && (
        <div className="mb-5 p-4 border border-delos/10 bg-delos/5 text-delos/40">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-ivory">{title}</h3>
      {description && <p className="mt-2 text-surface-500 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

// ── Progress Bar — Delos topographical line ────────────────────────
interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'gradient' | 'success';
}

export function Progress({ value, max = 100, className, showLabel, variant = 'gradient' }: ProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const barColors = {
    default: 'bg-delos',
    gradient: 'bg-gradient-to-r from-delos to-mesa',
    success: 'bg-gradient-to-r from-success-500 to-success-400',
  };

  return (
    <div className={cn('relative', className)}>
      <div className="h-[2px] bg-surface-200 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={cn('h-full relative', barColors[variant])}
        />
      </div>
      {showLabel && (
        <span className="absolute -top-5 text-xs font-mono font-medium text-mesa"
              style={{ left: `${Math.max(percentage - 2, 0)}%` }}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

// ── StatCard — Delos Terminal data module ────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon?: React.ReactNode;
}

export function StatCard({ label, value, change, changeType, icon }: StatCardProps) {
  return (
    <Card className="p-6 bg-transparent border-delos-grey border-[0.5px] hover:border-host-orange hover:shadow-[0_0_8px_1px_#FA831B55] hover:text-bone transition-all duration-200 group relative overflow-hidden">
      {/* Topographical background lines */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 11px, currentColor 11px, currentColor 12px),
                          repeating-linear-gradient(90deg, transparent, transparent 23px, currentColor 23px, currentColor 24px)`,
        color: '#83858D',
      }} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono text-delos-grey uppercase tracking-[0.15em] group-hover:text-bone transition-all">{label}</p>
          <motion.p
            className="text-xl font-bold text-bone font-heading mt-1 transition-all group-hover:text-host-orange"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {value}
          </motion.p>
          {change && (
            <p className={cn(
              'text-xs mt-1.5 font-mono font-medium flex items-center gap-1',
              changeType === 'positive' ? 'text-sublime-teal' : 'text-narrative-crimson'
            )}>
              <span>{changeType === 'positive' ? '↑' : '↓'}</span>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-transparent border border-delos-grey text-delos-grey group-hover:border-host-orange group-hover:text-host-orange transition-all duration-200">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── KBD — Keyboard shortcut ─────────────────────────────────────────
export function KBD({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn(
      'inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium',
      'bg-surface-50 text-surface-500 border border-aluminum/10',
      className
    )}>
      {children}
    </kbd>
  );
}
