import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.35,
};

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered children animation
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({ children, className, staggerDelay = 0.08 }: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// Scroll reveal animation
interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ScrollReveal({ children, className, delay = 0 }: ScrollRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated Glow button 
export function GlowButton({
  children,
  onClick,
  className = '',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative group overflow-hidden rounded-xl px-6 py-3 font-medium transition-all duration-300 disabled:opacity-50 ${className}`}
    >
      {/* Animated gradient border */}
      <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 opacity-80 blur-sm group-hover:opacity-100 transition-opacity" />
      <span className="absolute inset-[1px] rounded-[11px] bg-surface-50" />
      <span className="relative z-10 flex items-center justify-center gap-2 text-surface-900">
        {children}
      </span>
    </motion.button>
  );
}

// Animated counter for stats
export function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  duration = 1.5,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        {prefix}
        <Counter target={target} duration={duration} />
        {suffix}
      </motion.span>
    </motion.span>
  );
}

function Counter({ target, duration }: { target: number; duration: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      onViewportEnter={() => {
        if (!ref.current) return;
        let start = 0;
        const step = target / (duration * 60);
        const tick = () => {
          start += step;
          if (start >= target) {
            if (ref.current) ref.current.textContent = target.toLocaleString();
            return;
          }
          if (ref.current) ref.current.textContent = Math.floor(start).toLocaleString();
          requestAnimationFrame(tick);
        };
        tick();
      }}
    >
      0
    </motion.span>
  );
}

// Needs useRef import
import { useRef } from 'react';

// Glowing progress bar
export function GlowProgress({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="relative h-2 bg-surface-200/50 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full relative"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full blur-sm opacity-60" />
      </motion.div>
    </div>
  );
}

// Glassmorphism card wrapper
export function GlassCard({
  children,
  className = '',
  hover = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.25 }}
      onClick={onClick}
      className={`
        bg-surface-100/40 backdrop-blur-2xl
        rounded-2xl border border-surface-200/30
        shadow-card transition-all duration-300
        ${hover ? 'hover:shadow-card-hover hover:border-primary-500/20 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

// Gradient border card
export function GradientBorderCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-primary-500/40 via-transparent to-accent-500/40">
      <div className={`bg-surface-100/80 backdrop-blur-xl rounded-2xl ${className}`}>
        {children}
      </div>
    </div>
  );
}
