import { useNavigate } from 'react-router-dom';
import { motion, useInView, useMotionValue, useSpring, useScroll } from 'framer-motion';
import { useRef, useEffect, useState, useCallback, lazy, Suspense, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  Award,
  Wallet,
  CheckCircle2,
  Lock,
  Code2,
  TrendingUp,
  Bot,
  Scale,
  ArrowUpRight,
  Hexagon,
  Globe,
  Database,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/context/authStore';
import { TotemButton, ContractStatus, GlowBorderCard } from '@/components/ui/TotemUI';

const NeonRain = lazy(() => import('@/components/three/NeonRain'));
const DataStream = lazy(() => import('@/components/three/DataStream'));

/* ── Reveal Animations ─────────────────────────────────────────────────── */

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerChild = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouse = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    rotateX.set(((e.clientY - rect.top) / rect.height - 0.5) * -8);
    rotateY.set(((e.clientX - rect.left) / rect.width - 0.5) * 8);
  }, [rotateX, rotateY]);

  const handleLeave = useCallback(() => { rotateX.set(0); rotateY.set(0); }, [rotateX, rotateY]);

  return (
    <motion.div ref={ref} onMouseMove={handleMouse} onMouseLeave={handleLeave}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 800 }} className={className}>
      {children}
    </motion.div>
  );
}

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = target / 50;
        const tick = () => { start += step; if (start >= target) { setVal(target); return; } setVal(Math.floor(start)); requestAnimationFrame(tick); };
        tick();
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ── GSAP ScrollTrigger Registration ────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger);

/* ── Narrative Path — GSAP Horizontal Scroll + Cross-Dissolve ──────────── */
function NarrativePath({ steps: narrativeSteps }: { steps: typeof steps }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<HTMLDivElement[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panels = panelRefs.current.filter(Boolean);
      if (panels.length === 0) return;

      const totalWidth = panels.length * 100; // vw units

      // Create horizontal scroll driven by vertical scrolling
      const scrollTween = gsap.to(panels, {
        xPercent: -100 * (panels.length - 1),
        ease: 'none',
        scrollTrigger: {
          trigger: containerRef.current,
          pin: true,
          scrub: 1,
          snap: 1 / (panels.length - 1),
          end: () => `+=${totalWidth * 4}`,
          anticipatePin: 1,
        },
      });

      // Cross-dissolve: each panel fades in opacity as it enters center
      panels.forEach((panel, i) => {
        // Skip the first panel (already visible)
        if (i === 0) return;

        const inner = panel.querySelector('.narrative-content') as HTMLElement;
        if (!inner) return;

        gsap.fromTo(inner,
          { opacity: 0, scale: 0.92, filter: 'blur(8px)' },
          {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            ease: 'power2.out',
            scrollTrigger: {
              trigger: panel,
              containerAnimation: scrollTween,
              start: 'left 80%',
              end: 'left 30%',
              scrub: true,
            },
          }
        );

        // Fade OUT the previous panel as this one enters
        const prevInner = panels[i - 1]?.querySelector('.narrative-content') as HTMLElement;
        if (prevInner) {
          gsap.to(prevInner, {
            opacity: 0.15,
            scale: 0.95,
            filter: 'blur(4px)',
            ease: 'power2.in',
            scrollTrigger: {
              trigger: panel,
              containerAnimation: scrollTween,
              start: 'left 90%',
              end: 'left 50%',
              scrub: true,
            },
          });
        }
      });

      // Progress bar
      if (progressRef.current) {
        gsap.to(progressRef.current, {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top top',
            end: () => `+=${totalWidth * 4}`,
            scrub: true,
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="how-it-works" className="relative z-[2]">
      {/* Progress bar at top */}
      <div className="fixed top-16 left-0 right-0 z-[45] h-px bg-surface-200/20">
        <div
          ref={progressRef}
          className="h-full bg-gradient-to-r from-delos via-mesa to-delos origin-left"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      <div ref={containerRef} className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[#080808]/90" />
        {/* Topographical grid overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `repeating-radial-gradient(ellipse at 50% 50%, transparent 0px, transparent 39px, rgba(209,209,209,0.3) 39px, rgba(209,209,209,0.3) 40px)`,
        }} />

        {/* Section header — fixed during scroll */}
        <div className="absolute top-8 left-8 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-aluminum/15 bg-surface-50/50 backdrop-blur-sm mb-3">
            <Globe className="w-3 h-3 text-mesa" />
            <span className="text-[11px] font-medium text-mesa/80 tracking-wider uppercase font-mono">The Narrative Path</span>
          </div>
          <h2 className="font-serif text-xl font-semibold text-ivory/90 tracking-wide">
            Four Steps to <span className="text-delos">Trustless</span> Work
          </h2>
        </div>

        {/* Horizontal panels container */}
        <div className="flex h-screen">
          {narrativeSteps.map((step, i) => (
            <div
              key={step.num}
              ref={(el) => { if (el) panelRefs.current[i] = el; }}
              className="flex-shrink-0 w-screen h-screen flex items-center justify-center relative"
            >
              {/* Dissolve line between panels */}
              {i > 0 && (
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#080808] to-transparent z-10 pointer-events-none" />
              )}
              {i < narrativeSteps.length - 1 && (
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#080808] to-transparent z-10 pointer-events-none" />
              )}

              <div className="narrative-content relative max-w-lg text-center px-8">
                {/* Step number — large ghost */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-[120px] font-serif font-bold text-aluminum/[0.04] leading-none select-none pointer-events-none">
                  {step.num}
                </div>

                {/* Icon */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 border border-aluminum/10 bg-surface-50 mb-8 group">
                  <step.icon className="w-8 h-8 text-mesa" />
                  <span className="absolute -top-3 -right-3 w-7 h-7 bg-delos text-obsidian text-[11px] font-bold font-mono flex items-center justify-center tracking-wider">
                    {step.num}
                  </span>
                  {/* Decorative corner marks */}
                  <span className="absolute -top-px -left-px w-3 h-3 border-t border-l border-aluminum/20" />
                  <span className="absolute -top-px -right-px w-3 h-3 border-t border-r border-aluminum/20" />
                  <span className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-aluminum/20" />
                  <span className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-aluminum/20" />
                </div>

                <h3 className="text-2xl font-serif font-semibold text-ivory tracking-wide">{step.title}</h3>
                <p className="mt-4 text-surface-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>

                {/* Connecting dots */}
                <div className="mt-8 flex items-center justify-center gap-2">
                  {narrativeSteps.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                        idx === i ? 'bg-delos w-6 rounded-sm' : 'bg-aluminum/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; } else clearInterval(interval);
      }, 30);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);
  return <>{displayed}<span className="animate-pulse text-[#FFB800]">_</span></>;
}

/* ── Data ────────────────────────────────────────────────────────────────── */

const features = [
  { icon: Lock, title: 'Milestone Escrow', desc: 'Funds locked in audited smart contracts. Released only on milestone approval.', tag: 'SECURITY' },
  { icon: Bot, title: 'AI Oracle Grading', desc: 'On-chain AI grades skill tests and dispute analysis. Autonomous & incorruptible.', tag: 'AI' },
  { icon: Award, title: 'On-Chain Skill Badges', desc: 'Immutable NFT badges prove your expertise. Verified by AI, stored forever.', tag: 'NFT' },
  { icon: Users, title: 'Human Verification', desc: 'ZK-proof identity verification ensures you work with real, verified people.', tag: 'IDENTITY' },
  { icon: Scale, title: 'Decentralized Disputes', desc: 'Fair jury system with staked jurors and AI-recommended resolution.', tag: 'GOVERNANCE' },
  { icon: TrendingUp, title: 'Insurance Pool', desc: 'Optional project insurance protects against unforeseen issues with pooled risk.', tag: 'DEFI' },
];

const steps = [
  { num: '01', title: 'Connect Wallet', desc: 'Link your Hedera wallet and verify identity via on-chain credentials.', icon: Wallet },
  { num: '02', title: 'Post or Apply', desc: 'Create milestone-based escrow listings or apply with verified skill badges.', icon: Hexagon },
  { num: '03', title: 'Build & Deliver', desc: 'Collaborate securely with USDC held in audited smart contracts.', icon: Zap },
  { num: '04', title: 'Release & Rate', desc: 'Milestone approved, funds released instantly. Proof-of-work recorded on-chain.', icon: CheckCircle2 },
];

const contracts = [
  { name: 'ProjectEscrow', status: 'DEPLOYED', color: '#22c55e' },
  { name: 'UserRegistry', status: 'DEPLOYED', color: '#22c55e' },
  { name: 'SkillTrial', status: 'DEPLOYED', color: '#22c55e' },
  { name: 'AIOracle', status: 'ACTIVE', color: '#FFB800' },
  { name: 'DisputeJury', status: 'DEPLOYED', color: '#22c55e' },
  { name: 'InsurancePool', status: 'DEPLOYED', color: '#22c55e' },
  { name: 'GasSponsor', status: 'ACTIVE', color: '#FFB800' },
  { name: 'AgencyRegistry', status: 'DEPLOYED', color: '#22c55e' },
  { name: 'EnterpriseAccess', status: 'DEPLOYED', color: '#22c55e' },
];

const escrowSteps = [
  { icon: Wallet, label: 'DEPOSIT', title: 'Client Funds In', detail: 'USDC → ProjectEscrow.sol', amount: '$5,000', statusColor: '#FFB800', status: 'LOCKED' },
  { icon: Lock, label: 'ESCROW', title: 'Smart Contract Hold', detail: 'Split across milestones', amount: '3 milestones', statusColor: '#00F0FF', status: 'HOLDING' },
  { icon: Bot, label: 'VERIFY', title: 'AI Oracle Review', detail: 'AIOracle.sol grades quality', amount: '92/100', statusColor: '#FFB800', status: 'GRADED' },
  { icon: CheckCircle2, label: 'APPROVE', title: 'Milestone Accepted', detail: 'Client approves delivery', amount: 'M1 ✓', statusColor: '#22c55e', status: 'APPROVED' },
  { icon: TrendingUp, label: 'RELEASE', title: 'Instant Payout', detail: 'USDC → Freelancer wallet', amount: '$1,625', statusColor: '#22c55e', status: 'PAID' },
];

/* ════════════════════════════════════════════════════════════════════════════
   LANDING PAGE — Professional Vertical Scroll
   ════════════════════════════════════════════════════════════════════════════ */

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, connect } = useAuthStore();

  const pageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: pageRef });
  const [scrollVal, setScrollVal] = useState(0);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (v) => setScrollVal(v));
    return unsubscribe;
  }, [scrollYProgress]);

  const handleGetStarted = useCallback(async () => {
    if (isAuthenticated) navigate('/dashboard');
    else { await connect(); navigate('/register'); }
  }, [isAuthenticated, connect, navigate]);

  return (
    <div ref={pageRef} className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
      {/* 3D background — persistent, interactive */}
      <div className="fixed inset-0 z-[1]">
        <Suspense fallback={null}>
          <NeonRain scrollProgress={scrollVal} />
        </Suspense>
      </div>

      {/* ── Sticky Navigation Bar ──────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#FFB800]/[0.06] bg-[#080808]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 border border-[#FFB800]/20 bg-[#FFB800]/5 flex items-center justify-center">
              <span className="text-[#FFB800] font-bold text-xs font-display">H</span>
            </div>
            <span className="font-display font-semibold text-sm text-white/90">
              Human<span className="text-[#FFB800]">Work</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Contracts'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-xs text-[#a0a4ba] hover:text-[#FFB800] transition-colors font-mono tracking-wider uppercase">
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <TotemButton variant="secondary" size="sm" onClick={() => navigate('/jobs')}>
              Explore Jobs
            </TotemButton>
            <TotemButton variant="primary" size="sm" onClick={handleGetStarted}>
              Launch App <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </TotemButton>
          </div>
        </div>
      </nav>

      {/* ═══ SECTION 1: HERO ═══ */}
      <section className="relative min-h-screen flex items-center z-[2] pt-16 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#080808]/80 via-transparent to-[#080808]/70 z-[1]" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#080808] to-transparent z-[1]" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
              {/* Live badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 border border-[#22c55e]/30 bg-[#22c55e]/5 mb-10 terminal-corners pointer-events-auto">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full bg-[#22c55e] opacity-75" />
                  <span className="relative h-2 w-2 bg-[#22c55e]" />
                </span>
                <span className="text-xs font-medium text-[#22c55e]/90 tracking-wide font-mono">LIVE // HEDERA TESTNET</span>
              </div>

              <h1 className="font-display font-bold leading-[1.0] tracking-tight">
                <span className="text-white/95 text-mask-3d">The Future of</span>
                <br />
                <span className="bg-gradient-to-r from-[#FFB800] via-[#ffc433] to-[#FFB800] bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient">
                  Freelance Work
                </span>
              </h1>

              <p className="mt-6 text-[#a0a4ba] max-w-lg leading-relaxed font-light" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>
                Smart contract escrow. AI-verified skills. Decentralized dispute resolution.
                Built on Hedera Hashgraph.
              </p>

              <div className="mt-4 font-mono text-xs text-[#00F0FF]/60">
                <span className="text-[#FFB800]/50">$</span> <TypewriterText text="humanwork deploy --contracts 9 --network hedera-testnet" delay={600} />
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-4 pointer-events-auto">
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                  <TotemButton onClick={handleGetStarted} variant="primary" size="lg" className="font-bold tracking-wide">
                    Launch App
                    <ArrowRight className="w-4 h-4 ml-1 icon-glow" />
                  </TotemButton>
                </motion.div>
                <TotemButton variant="secondary" size="lg" onClick={() => navigate('/jobs')}>
                  Explore Jobs
                  <ExternalLink className="w-3.5 h-3.5 ml-1 icon-depth" />
                </TotemButton>
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.8 }}
                className="mt-14 flex items-center gap-8 border-t border-[#FFB800]/10 pt-6 pointer-events-auto">
                {[
                  { label: 'Contracts', value: '9 Deployed' },
                  { label: 'Finality', value: '< 5s' },
                  { label: 'Platform Fee', value: '2.5%' },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col">
                    <span className="text-[11px] text-[#00F0FF] uppercase tracking-wider font-mono">{s.label}</span>
                    <span className="text-sm font-semibold text-white/80 mt-0.5">{s.value}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2 text-xs font-mono text-[#FFB800]/30">
            <span className="tracking-widest">SCROLL</span>
            <div className="w-px h-6 bg-gradient-to-b from-[#FFB800]/30 to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 2: STATS ═══ */}
      <section className="relative z-[2] border-y border-[#FFB800]/[0.06]">
        <div className="absolute inset-0 bg-[#080808]/90 backdrop-blur-sm" />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 lg:py-20">
          <Reveal className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#00F0FF]/20 bg-[#00F0FF]/5 mb-6 terminal-corners">
              <Shield className="w-3 h-3 text-[#00F0FF]" />
              <span className="text-[11px] font-medium text-[#00F0FF]/80 tracking-wider uppercase font-mono">Protocol Stats</span>
            </div>
            <h2 className="font-display font-bold text-white tracking-tight">
              Battle-Tested <span className="text-[#FFB800]">Infrastructure</span>
            </h2>
          </Reveal>

          <StaggerReveal className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[
              { value: 9, suffix: '', label: 'Smart Contracts', icon: Code2 },
              { value: 100, suffix: '%', label: 'On-Chain Verified', icon: Shield },
              { value: 47, suffix: '+', label: 'Tests Passing', icon: CheckCircle2 },
              { value: 0, suffix: '', label: 'Security Issues', icon: Lock },
            ].map((stat) => (
              <motion.div key={stat.label} variants={staggerChild}>
                <div className="terminal-corners glitch-hover">
                  <div className="flex items-center gap-4 p-5 lg:p-6 border border-[#FFB800]/10 bg-[#0A0A0D] hover:border-[#FFB800]/30 transition-all duration-300 group">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#FFB800]/5 border border-[#FFB800]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FFB800]/10 group-hover:border-[#FFB800]/30 transition-all duration-300"
                      style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
                      <stat.icon className="w-5 h-5 lg:w-6 lg:h-6 text-[#FFB800]/70 group-hover:text-[#FFB800] transition-colors duration-300 icon-glow" />
                    </div>
                    <div>
                      <p className="text-2xl lg:text-3xl font-bold font-display text-white">
                        <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                      </p>
                      <p className="text-[10px] lg:text-xs text-[#737892] mt-0.5 font-mono uppercase tracking-wider">{stat.label}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* ═══ SECTION 3: FEATURES ═══ */}
      <section id="features" className="relative z-[2] overflow-hidden">
        <div className="absolute inset-0 bg-[#080808]/85" />
        <div className="absolute inset-0 opacity-15">
          <Suspense fallback={null}>
            <DataStream />
          </Suspense>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-32">
          <Reveal className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FFB800]/20 bg-[#FFB800]/5 mb-6 terminal-corners">
              <Hexagon className="w-3 h-3 text-[#FFB800]" />
              <span className="text-[11px] font-medium text-[#FFB800]/80 tracking-wider uppercase font-mono">Protocol Architecture</span>
            </div>
            <h2 className="font-display font-bold text-white tracking-tight">
              Built for the <span className="text-[#FFB800]">Decentralized</span> Economy
            </h2>
            <p className="mt-4 text-[#737892] max-w-lg mx-auto" style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1.125rem)' }}>
              Nine audited smart contracts forming a trustless, verifiable freelancing protocol on Hedera.
            </p>
          </Reveal>

          <StaggerReveal className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {features.map((feature) => (
              <motion.div key={feature.title} variants={staggerChild}>
                <TiltCard className="h-full">
                  <GlowBorderCard className="h-full">
                    <div className="group relative p-6 h-full glitch-hover">
                      <span className="inline-block px-2 py-0.5 text-[9px] font-mono font-bold text-[#00F0FF] tracking-wider border border-[#00F0FF]/20 mb-4"
                        style={{ clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)' }}>
                        {feature.tag}
                      </span>
                      <div className="w-10 h-10 bg-gradient-to-br from-[#FFB800]/10 to-[#00F0FF]/5 border border-[#FFB800]/15 flex items-center justify-center mb-4 group-hover:from-[#FFB800]/20 group-hover:border-[#FFB800]/30 transition-all duration-300"
                        style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }}>
                        <feature.icon className="w-5 h-5 text-[#FFB800]/70 group-hover:text-[#FFB800] transition-colors duration-300 icon-glow" />
                      </div>
                      <h3 className="text-base font-semibold text-white/90 font-display">{feature.title}</h3>
                      <p className="mt-2 text-sm text-[#737892] leading-relaxed">{feature.desc}</p>
                      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#FFB800]/0 to-transparent group-hover:via-[#FFB800]/25 transition-all duration-500" />
                    </div>
                  </GlowBorderCard>
                </TiltCard>
              </motion.div>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* ═══ SECTION 4: HOW IT WORKS — Narrative Path ═══ */}
      <NarrativePath steps={steps} />

      {/* ═══ SECTION 5: LIVE CONTRACTS ═══ */}
      <section id="contracts" className="relative z-[2]">
        <div className="absolute inset-0 bg-[#080808]/90" />

        <div className="relative max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-32">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#22c55e]/20 bg-[#22c55e]/5 mb-6 terminal-corners">
              <Database className="w-3 h-3 text-[#22c55e]" />
              <span className="text-[11px] font-medium text-[#22c55e]/80 tracking-wider uppercase font-mono">Infrastructure</span>
            </div>
            <h2 className="font-display font-bold text-white tracking-tight">
              9 Contracts. <span className="text-[#FFB800]">All Live.</span>
            </h2>
          </Reveal>

          <Reveal>
            <div className="border border-[#FFB800]/10 bg-[#0A0A0D] overflow-hidden terminal-corners">
              {/* Terminal header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#FFB800]/10 bg-[#111111]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-[#ef4444]/70" />
                  <div className="w-2.5 h-2.5 bg-[#FFB800]/70" />
                  <div className="w-2.5 h-2.5 bg-[#22c55e]/70" />
                </div>
                <span className="text-[11px] font-mono text-[#00F0FF]/50 ml-2">humanwork-protocol // contract status</span>
                <span className="ml-auto text-[9px] font-mono text-[#22c55e]/60 tracking-wider animate-pulse">● LIVE</span>
              </div>

              <div className="p-5 space-y-2">
                {contracts.map((c, i) => (
                  <ContractStatus
                    key={c.name}
                    name={`${String(i + 1).padStart(2, '0')} │ ${c.name}.sol`}
                    status={c.status}
                    statusColor={c.color}
                  />
                ))}
                <div className="mt-4 pt-4 border-t border-[#FFB800]/10 text-[#00F0FF]/50">
                  <p className="font-mono text-xs">
                    <span className="text-[#FFB800]/50">$</span> <TypewriterText text="all systems operational — hedera testnet chain 296" delay={500} />
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ SECTION 6: ESCROW FLOW ═══ */}
      <section className="relative z-[2]">
        <div className="absolute inset-0 bg-[#080808]/90" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,184,0,.25) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-32">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#FFB800]/20 bg-[#FFB800]/5 mb-6 terminal-corners">
              <Wallet className="w-3 h-3 text-[#FFB800]" />
              <span className="text-[11px] font-medium text-[#FFB800]/80 tracking-wider uppercase font-mono">Escrow Pipeline</span>
            </div>
            <h2 className="font-display font-bold text-white tracking-tight">
              How Funds Flow <span className="text-[#FFB800]">On-Chain</span>
            </h2>
            <p className="mt-4 text-[#737892]" style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1.125rem)' }}>
              Every dollar tracked, verified, and immutable. From deposit to release.
            </p>
          </Reveal>

          <div className="relative">
            {/* Connecting line — desktop */}
            <div className="hidden lg:block absolute top-[56px] left-[10%] right-[10%] h-px">
              <div className="h-full bg-[#252525]" />
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#FFB800] via-[#FFB800]/40 to-transparent"
                initial={{ width: '0%' }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 3, delay: 0.3, ease: 'easeOut' }}
              />
            </div>

            <StaggerReveal className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {escrowSteps.map((node, i) => (
                <motion.div key={node.label} variants={staggerChild}>
                  <TiltCard className="group relative border border-[#FFB800]/[0.08] bg-[#0A0A0D] p-5 hover:border-[#FFB800]/25 transition-all duration-300 h-full liquid-glow glitch-hover">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 border border-[#FFB800]/10 bg-[#111111] flex items-center justify-center group-hover:border-[#FFB800]/25 transition-all duration-300">
                        <node.icon className="w-4 h-4 text-[#00F0FF] group-hover:text-[#FFB800] transition-colors duration-300 icon-glow" />
                      </div>
                      <div>
                        <p className="text-[9px] font-mono text-[#00F0FF]/50 tracking-[0.15em]">STEP {String(i + 1).padStart(2, '0')}</p>
                        <p className="text-[10px] font-mono font-bold tracking-wider" style={{ color: node.statusColor }}>{node.label}</p>
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold text-white/90 font-display">{node.title}</h4>
                    <p className="mt-1 text-xs text-[#737892]">{node.detail}</p>
                    <div className="mt-4 pt-3 border-t border-[#FFB800]/[0.06] flex items-center justify-between">
                      <span className="text-xs font-mono text-white/60">{node.amount}</span>
                      <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 font-bold" style={{
                        color: node.statusColor,
                        backgroundColor: `${node.statusColor}15`,
                        border: `1px solid ${node.statusColor}30`,
                      }}>
                        {node.status}
                      </span>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </StaggerReveal>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 7: CTA ═══ */}
      <section className="relative z-[2]">
        <div className="absolute inset-0 bg-[#080808]/85" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#FFB800]/[0.025] blur-[150px]" />

        <div className="relative max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-32 lg:py-40 text-center">
          <Reveal>
            <h2 className="font-display font-bold text-white tracking-tight leading-[1.1]">
              Ready to Build on
              <br />
              <span className="bg-gradient-to-r from-[#FFB800] via-[#ffc433] to-[#FFB800] bg-clip-text text-transparent">
                Trustless Infrastructure
              </span>
              ?
            </h2>
            <p className="mt-5 text-[#737892] max-w-md mx-auto" style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1.125rem)' }}>
              Connect your wallet, verify your skills, and start working in the decentralized economy.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                <TotemButton onClick={handleGetStarted} variant="primary" size="lg">
                  Get Started
                  <ArrowUpRight className="w-4 h-4 ml-1 icon-glow" />
                </TotemButton>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-[2] border-t border-[#FFB800]/10 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-[#FFB800]/25 bg-[#FFB800]/5 flex items-center justify-center">
                <span className="text-[#FFB800] font-bold text-sm font-display">H</span>
              </div>
              <span className="font-display font-bold text-lg text-white">
                Human<span className="text-[#FFB800]">Work</span>
              </span>
            </div>
            <div className="flex items-center gap-8">
              {['GitHub', 'Docs', 'Discord', 'Twitter'].map((link) => (
                <a key={link} href="#" className="text-[#00F0FF] hover:text-[#FFB800] transition-colors text-sm font-medium font-mono">
                  {link}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-[#00F0FF]/60 font-mono">Built on Hedera</span>
              <span className="text-[#2A2A2A]">|</span>
              <span className="text-[11px] text-[#737892] font-mono">&copy; {new Date().getFullYear()} HumanWork Protocol</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
