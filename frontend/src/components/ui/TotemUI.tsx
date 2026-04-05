import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { ReactNode, useRef, useState, useCallback, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   Totem UI — BR2049 Brutalist components with polyhedron clip-paths,
   particle explosions, liquid transitions, and glow borders.
   Colors: #FFB800 (neon orange), #00F0FF (teal), #0D0D0D (charcoal)
   All corners: 0px (brutalist). Cinematic cubic-bezier easing.
   ═══════════════════════════════════════════════════════════════════════════ */

const CINEMATIC_EASE = [0.16, 1, 0.3, 1] as const;
const CINEMATIC_TRANSITION = { duration: 0.6, ease: CINEMATIC_EASE };

/* ── Polyhedron Clip-Path Button ──────────────────────────────────── */
interface TotemButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TotemButton({
  children,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false,
  size = 'md',
}: TotemButtonProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; angle: number; speed: number; size: number; color: string }>>([]);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const nextId = useRef(0);

  const triggerParticles = useCallback((e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newParticles = Array.from({ length: 12 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      const pSize = 2 + Math.random() * 4;
      const colors = ['#FFB800', '#ffc433', '#00F0FF', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      return { id: nextId.current++, x, y, angle, speed, size: pSize, color };
    });

    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 700);
  }, []);

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  const variants = {
    primary: {
      bg: 'from-[#FFB800] to-[#cc5800]',
      text: 'text-black',
      glow: 'rgba(255,184,0,0.4)',
      border: 'rgba(255,184,0,0.5)',
    },
    secondary: {
      bg: 'from-[#1A1A1A] to-[#111111]',
      text: 'text-white/90',
      glow: 'rgba(0,240,255,0.3)',
      border: 'rgba(255,255,255,0.1)',
    },
    accent: {
      bg: 'from-[#00F0FF] to-[#00bbbb]',
      text: 'text-black',
      glow: 'rgba(0,240,255,0.4)',
      border: 'rgba(0,240,255,0.5)',
    },
  };

  const v = variants[variant];

  return (
    <motion.button
      ref={buttonRef}
      onClick={(e) => {
        triggerParticles(e);
        onClick?.();
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      disabled={disabled}
      className={`
        relative overflow-hidden font-semibold tracking-wide
        bg-gradient-to-r ${v.bg} ${v.text}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizes[size]}
        ${className}
      `}
      style={{
        clipPath: 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)',
      }}
      whileHover={{ scale: disabled ? 1 : 1.04, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      transition={CINEMATIC_TRANSITION}
    >
      {/* Animated glow border */}
      <motion.span
        className="absolute inset-0 pointer-events-none"
        style={{
          clipPath: 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)',
          boxShadow: isHovered
            ? `0 0 30px ${v.glow}, inset 0 0 20px ${v.glow}`
            : `0 0 0px transparent`,
        }}
        animate={{
          boxShadow: isHovered
            ? `0 0 30px ${v.glow}, inset 0 0 20px ${v.glow}`
            : '0 0 0px transparent',
        }}
        transition={{ duration: 0.4, ease: CINEMATIC_EASE }}
      />

      {/* Liquid sweep effect on hover */}
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 pointer-events-none"
        initial={{ x: '-100%' }}
        animate={{ x: isHovered ? '200%' : '-100%' }}
        transition={{ duration: 0.8, ease: CINEMATIC_EASE }}
      />

      {/* Glitch flicker on hover */}
      {isHovered && (
        <motion.span
          className="absolute inset-0 bg-white/5 pointer-events-none"
          animate={{ opacity: [0, 0.1, 0, 0.05, 0] }}
          transition={{ duration: 0.3, repeat: 1 }}
        />
      )}

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>

      {/* Particle explosion */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.span
            key={p.id}
            className="absolute pointer-events-none"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
            initial={{ scale: 1, opacity: 1, x: 0, y: 0 }}
            animate={{
              x: Math.cos(p.angle) * p.speed,
              y: Math.sin(p.angle) * p.speed,
              scale: 0,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: CINEMATIC_EASE }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
}

/* ── Profile Frame — Polyhedron clip-path with glow border ────────── */
interface ProfileFrameProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProfileFrame({
  children,
  className = '',
  glowColor = '#FFB800',
  size = 'md',
}: ProfileFrameProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const hexClip = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative inline-block ${className}`}
      whileHover={{ scale: 1.08 }}
      transition={CINEMATIC_TRANSITION}
    >
      {/* Outer glow border */}
      <motion.div
        className={`absolute -inset-[3px] ${sizes[size]}`}
        style={{
          clipPath: hexClip,
          background: `linear-gradient(135deg, ${glowColor}, transparent, ${glowColor})`,
        }}
        animate={{
          opacity: isHovered ? 1 : 0.4,
          boxShadow: isHovered
            ? `0 0 20px ${glowColor}40, 0 0 40px ${glowColor}20`
            : '0 0 0 transparent',
        }}
        transition={{ duration: 0.5, ease: CINEMATIC_EASE }}
      />

      {/* Rotating glow ring */}
      <motion.div
        className="absolute -inset-[5px]"
        style={{
          clipPath: hexClip,
          background: `conic-gradient(from 0deg, transparent, ${glowColor}60, transparent, ${glowColor}30, transparent)`,
        }}
        animate={{ rotate: isHovered ? 360 : 0 }}
        transition={{ duration: 3, ease: 'linear', repeat: isHovered ? Infinity : 0 }}
      />

      {/* Content container */}
      <div
        className={`relative ${sizes[size]} overflow-hidden bg-[#0D0D0D]`}
        style={{ clipPath: hexClip }}
      >
        {children}
      </div>
    </motion.div>
  );
}

/* ── Smart Contract Status — with particle explosion on hover ─────── */
interface ContractStatusProps {
  name: string;
  status: string;
  statusColor?: string;
  className?: string;
}

export function ContractStatus({
  name,
  status,
  statusColor = '#22c55e',
  className = '',
}: ContractStatusProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number; size: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const handleHoverStart = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const burst = Array.from({ length: 16 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      return {
        id: nextId.current++,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 3,
      };
    });

    setParticles(burst);
    setTimeout(() => setParticles([]), 800);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      onHoverStart={handleHoverStart}
      className={`
        relative overflow-hidden px-4 py-3
        border border-[#FFB800]/08 bg-[#0D0D0D]/80 backdrop-blur-sm
        hover:border-[#FFB800]/20
        transition-all duration-500 cursor-default group
        ${className}
      `}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={CINEMATIC_TRANSITION}
    >
      {/* Liquid transition background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${statusColor}08, transparent 70%)`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 2, opacity: 1 }}
        transition={{ duration: 0.6, ease: CINEMATIC_EASE }}
      />

      <div className="relative z-10 flex items-center justify-between">
        <span className="font-mono text-xs text-white/80 font-medium">{name}</span>
        <motion.span
          className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider"
          style={{
            color: statusColor,
            backgroundColor: `${statusColor}15`,
            border: `1px solid ${statusColor}25`,
          }}
          whileHover={{ scale: 1.1 }}
          transition={CINEMATIC_TRANSITION}
        >
          {status}
        </motion.span>
      </div>

      {/* Particle burst */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.span
            key={p.id}
            className="absolute pointer-events-none"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: statusColor,
              boxShadow: `0 0 ${p.size * 3}px ${statusColor}`,
            }}
            initial={{ scale: 1, opacity: 0.8, x: 0, y: 0 }}
            animate={{
              x: p.vx,
              y: p.vy,
              scale: 0,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: CINEMATIC_EASE }}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Glow Border Card — animated conic gradient border ────────────── */
interface GlowBorderCardProps {
  children: ReactNode;
  className?: string;
  glowIntensity?: number;
  borderWidth?: number;
}

export function GlowBorderCard({
  children,
  className = '',
  glowIntensity = 0.5,
  borderWidth = 1,
}: GlowBorderCardProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 0.5) % 360);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative group ${className}`}>
      {/* Animated gradient border */}
      <div
        className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background: `conic-gradient(from ${rotation}deg, rgba(255,184,0,${glowIntensity}), transparent, rgba(0,240,255,${glowIntensity}), transparent, rgba(255,184,0,${glowIntensity}))`,
          padding: borderWidth,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Static border — brutalist */}
      <div
        className="relative bg-[#0D0D0D]/90 backdrop-blur-xl overflow-hidden"
        style={{
          border: '0.5px solid rgba(255,184,0,0.07)',
        }}
      >
        {/* Inner glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFB800]/[0.01] via-transparent to-[#00F0FF]/[0.01] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        {children}
      </div>
    </div>
  );
}

/* ── Liquid Hover Card — morphing spotlight ───────────────────────── */
interface LiquidCardProps {
  children: ReactNode;
  className?: string;
}

export function LiquidCard({ children, className = '' }: LiquidCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const handleMouse = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(((e.clientX - rect.left) / rect.width) * 100);
    mouseY.set(((e.clientY - rect.top) / rect.height) * 100);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouse}
      className={`
        relative overflow-hidden
        bg-[#0D0D0D]/80 backdrop-blur-xl
        border border-[#FFB800]/[0.05]
        hover:border-[#FFB800]/[0.15]
        transition-colors duration-500
        ${className}
      `}
      whileHover={{ y: -3, scale: 1.005 }}
      transition={CINEMATIC_TRANSITION}
    >
      {/* Liquid spotlight */}
      <motion.div
        className="absolute w-[200px] h-[200px] pointer-events-none opacity-0 group-hover:opacity-100"
        style={{
          left: smoothX,
          top: smoothY,
          translateX: '-50%',
          translateY: '-50%',
          background: 'radial-gradient(circle, rgba(255,184,0,0.06) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ── CSS Utility Classes for Totem UI ─────────────────────────────── */
export const totemClipPaths = {
  hexagon: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  pentagon: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
  octagon: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
  chevron: 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)',
  parallelogram: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)',
} as const;
