import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  Award,
  Globe,
  Wallet,
  CheckCircle2,
  Sparkles,
  Lock,
  BarChart3,
  Code2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/common';
import { useAuthStore } from '@/context/authStore';

const features = [
  {
    icon: Shield,
    title: 'Secure Escrow',
    description: 'Funds held safely in smart contracts until milestones are approved. Zero counterparty risk.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Zap,
    title: 'AI-Powered Matching',
    description: 'Advanced AI matches freelancers with perfect job opportunities using skill analysis.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Award,
    title: 'On-Chain Credentials',
    description: 'Earn NFT skill badges verified by AI assessments. Portable, immutable proof of expertise.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Users,
    title: 'Human Verified',
    description: 'ZK-proof verification ensures you work with real humans. No bots, no fakes.',
    gradient: 'from-emerald-500 to-teal-500',
  },
];

const stats = [
  { value: '$2.5M+', label: 'Total Value Locked', icon: Lock },
  { value: '1,200+', label: 'Verified Freelancers', icon: Users },
  { value: '450+', label: 'Projects Completed', icon: BarChart3 },
  { value: '0%', label: 'Transaction Fees', icon: Sparkles },
];

const techStack = [
  'Smart Contracts', 'AI Oracle', 'ZK Proofs', 'IPFS Storage',
  'Milestone Escrow', 'NFT Badges', 'Dispute Resolution', 'Gasless UX',
];

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, connect, isConnecting } = useAuthStore();

  const handleGetStarted = async () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      await connect();
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 overflow-hidden">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen flex items-center">
        {/* Animated background effects */}
        <div className="absolute inset-0">
          {/* Grid pattern */}
          <div className="absolute inset-0 blockchain-grid opacity-60" />
          
          {/* Gradient orbs */}
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary-500/15 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-accent-500/10 rounded-full blur-[100px] animate-pulse-slow animation-delay-300" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/5 rounded-full blur-[150px]" />
          
          {/* Orbiting rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] animate-orbit opacity-[0.03]">
            <div className="absolute top-0 left-1/2 w-3 h-3 bg-primary-400 rounded-full" />
            <div className="absolute bottom-0 right-1/4 w-2 h-2 bg-accent-400 rounded-full" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/[0.03] animate-orbit-reverse" />
        </div>

        {/* Top navigation bar */}
        <nav className="absolute top-0 left-0 right-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-neon-blue">
                  <span className="text-white font-bold text-lg font-display">H</span>
                </div>
                <span className="font-display font-bold text-xl text-white">HumanWork</span>
              </div>
              
              <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-white/60 hover:text-white transition-colors text-sm">Features</a>
                <a href="#how-it-works" className="text-white/60 hover:text-white transition-colors text-sm">How It Works</a>
                <a href="#tech" className="text-white/60 hover:text-white transition-colors text-sm">Technology</a>
              </div>

              <button
                onClick={handleGetStarted}
                disabled={isConnecting}
                className="btn bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
              >
                <Wallet className="w-4 h-4" />
                {isConnecting ? 'Connecting...' : 'Launch App'}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 backdrop-blur-sm rounded-full mb-8"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-400"></span>
                </span>
                <span className="text-sm text-primary-300 font-medium">Live on Hedera Testnet</span>
              </motion.div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-white leading-[1.1] tracking-tight">
                The Future of{' '}
                <span className="text-gradient bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-[length:200%_auto] animate-gradient">
                  Work
                </span>
                {' '}is{' '}
                <span className="text-white/90">
                  On-Chain
                </span>
              </h1>
              
              <p className="mt-6 text-lg sm:text-xl text-white/50 max-w-xl leading-relaxed">
                A decentralized freelancing protocol with AI-powered skill verification, 
                milestone-based escrow, and zero platform fees.
              </p>
              
              <div className="mt-10 flex flex-wrap gap-4">
                <Button
                  onClick={handleGetStarted}
                  isLoading={isConnecting}
                  size="lg"
                  className="bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 shadow-neon-blue border-0 focus:ring-primary-400"
                >
                  <Wallet className="w-5 h-5" />
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-white/70 border border-white/10 hover:bg-white/5 hover:text-white focus:ring-white/20"
                  onClick={() => navigate('/jobs')}
                >
                  <Globe className="w-5 h-5" />
                  Explore Jobs
                </Button>
              </div>

              {/* Social proof */}
              <div className="mt-14 flex items-center gap-6">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-surface-900 bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-white font-semibold">1,200+ Verified Users</p>
                  <p className="text-white/40 text-sm">Join the community →</p>
                </div>
              </div>
            </motion.div>

            {/* Right - Dashboard preview card */}
            <motion.div
              initial={{ opacity: 0, y: 40, rotateX: 5 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block"
            >
              <div className="relative">
                {/* Glow behind card */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-3xl blur-3xl scale-95" />
                
                <div className="relative card-dark glow-border rounded-3xl p-8">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-neon-blue">
                          <span className="text-white font-bold text-xl">H</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold">Dashboard</p>
                          <p className="text-white/40 text-sm">Welcome back!</p>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                        ● Verified
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                        <p className="text-white/40 text-sm">Earnings</p>
                        <p className="text-2xl font-bold text-white mt-1 font-display">$12,450</p>
                        <p className="text-emerald-400 text-sm mt-1">↗ +23%</p>
                      </div>
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                        <p className="text-white/40 text-sm">Active Jobs</p>
                        <p className="text-2xl font-bold text-white mt-1 font-display">5</p>
                        <p className="text-primary-400 text-sm mt-1">2 pending</p>
                      </div>
                    </div>

                    {/* Activity */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                      <p className="text-white/40 text-sm mb-3">Recent Activity</p>
                      <div className="space-y-3">
                        {[
                          { text: 'Milestone approved — $2,500', color: 'bg-emerald-400' },
                          { text: 'New job match found', color: 'bg-primary-400' },
                          { text: 'Skill badge earned: Solidity', color: 'bg-amber-400' },
                        ].map((activity, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + i * 0.15 }}
                            className="flex items-center gap-3 group"
                          >
                            <div className={`w-2 h-2 rounded-full ${activity.color} group-hover:shadow-neon`} />
                            <p className="text-white/60 text-sm group-hover:text-white/80 transition-colors">{activity.text}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 bg-white/40 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ===== STATS SECTION ===== */}
      <section className="relative py-20 border-t border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-900 via-surface-900/95 to-surface-900" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center group"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 mb-4 group-hover:bg-primary-500/20 transition-colors">
                  <stat.icon className="w-5 h-5 text-primary-400" />
                </div>
                <p className="text-3xl sm:text-4xl font-display font-bold text-white">
                  {stat.value}
                </p>
                <p className="mt-2 text-white/40 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="relative py-24 lg:py-32">
        <div className="absolute inset-0">
          <div className="absolute inset-0 blockchain-grid opacity-40" />
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-[150px]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-6 text-sm text-white/60">
              <Code2 className="w-4 h-4 text-primary-400" />
              Built for Web3
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white">
              Why Choose{' '}
              <span className="text-gradient">HumanWork</span>?
            </h2>
            <p className="mt-4 text-lg text-white/40">
              The most advanced decentralized freelancing protocol with 
              enterprise-grade security and AI-powered features.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card-dark card-dark-hover rounded-2xl p-8 group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/40 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <section id="how-it-works" className="relative py-24 lg:py-32">
        <div className="absolute inset-0">
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-500/5 rounded-full blur-[150px]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-white/40">
              Get started in minutes. No middlemen, no hidden fees.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-24 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px bg-gradient-to-r from-primary-500/30 via-white/10 to-primary-500/30" />
            
            {[
              {
                step: '01',
                title: 'Connect & Verify',
                description: 'Connect your wallet and verify your identity with our ZK-proof human verification system.',
                icon: Wallet,
                gradient: 'from-primary-500 to-blue-500',
              },
              {
                step: '02',
                title: 'Find or Post Jobs',
                description: 'Browse available jobs or post your project with milestone-based payments locked in escrow.',
                icon: Globe,
                gradient: 'from-purple-500 to-primary-500',
              },
              {
                step: '03',
                title: 'Collaborate & Earn',
                description: 'Work securely with automated escrow. Funds release instantly on milestone approval.',
                icon: CheckCircle2,
                gradient: 'from-emerald-500 to-teal-500',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative text-center"
              >
                {/* Step number with glow */}
                <div className="relative inline-flex mb-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg relative z-10`}>
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.gradient} blur-xl opacity-30`} />
                </div>
                
                <div className="text-sm font-mono text-primary-400 mb-2">{item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-white/40 leading-relaxed max-w-xs mx-auto">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TECHNOLOGY SECTION ===== */}
      <section id="tech" className="relative py-24 lg:py-32 border-t border-white/[0.06]">
        <div className="absolute inset-0 blockchain-grid opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white">
              Built on{' '}
              <span className="text-gradient">Cutting-Edge Tech</span>
            </h2>
            <p className="mt-4 text-lg text-white/40">
              Enterprise-grade infrastructure for the future of decentralized work.
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map((tech, index) => (
              <motion.div
                key={tech}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="px-5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-full text-white/60 text-sm font-medium hover:bg-primary-500/10 hover:border-primary-500/30 hover:text-primary-300 transition-all duration-300 cursor-default"
              >
                {tech}
              </motion.div>
            ))}
          </div>

          {/* Protocol highlights */}
          <div className="mt-16 grid sm:grid-cols-3 gap-6">
            {[
              { value: '10+', label: 'Smart Contracts', desc: 'Audited & secure' },
              { value: '0%', label: 'Platform Fees', desc: 'Unlike Upwork\'s 20%' },
              { value: '48hr', label: 'Dispute Resolution', desc: 'AI-powered arbitration' },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card-dark card-dark-hover rounded-2xl p-6 text-center"
              >
                <p className="text-3xl font-display font-bold text-gradient">{item.value}</p>
                <p className="text-white font-medium mt-2">{item.label}</p>
                <p className="text-white/30 text-sm mt-1">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="relative py-24 lg:py-32">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary-500/10 rounded-full blur-[150px]" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white leading-tight">
              Ready to Join the{' '}
              <span className="text-gradient">Decentralized</span>{' '}
              Workforce?
            </h2>
            <p className="mt-6 text-lg text-white/40 max-w-2xl mx-auto">
              Connect your wallet, verify your identity, and start earning or hiring 
              on the most secure freelancing protocol in Web3.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button
                onClick={handleGetStarted}
                isLoading={isConnecting}
                size="lg"
                className="bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 shadow-neon-blue border-0 focus:ring-primary-400"
              >
                <Wallet className="w-5 h-5" />
                Launch App
                <ArrowRight className="w-5 h-5" />
              </Button>
              <button
                className="btn btn-lg text-white/60 border border-white/10 hover:bg-white/5 hover:text-white transition-all"
                onClick={() => window.open('https://github.com/AniketSatve20/HumanWork-Protocol', '_blank')}
              >
                <Code2 className="w-5 h-5" />
                View on GitHub
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg font-display">H</span>
                </div>
                <span className="font-display font-bold text-xl text-white">HumanWork</span>
              </div>
              <p className="text-white/30 text-sm leading-relaxed">
                Decentralized B2B freelancing protocol with AI-powered skill verification.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-medium mb-4 text-sm uppercase tracking-wider">Protocol</h4>
              <div className="space-y-3">
                <a href="#features" className="block text-white/40 hover:text-white transition-colors text-sm">Features</a>
                <a href="#how-it-works" className="block text-white/40 hover:text-white transition-colors text-sm">How It Works</a>
                <a href="#tech" className="block text-white/40 hover:text-white transition-colors text-sm">Technology</a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-medium mb-4 text-sm uppercase tracking-wider">Resources</h4>
              <div className="space-y-3">
                <a href="#" className="block text-white/40 hover:text-white transition-colors text-sm">Documentation</a>
                <a href="https://github.com/AniketSatve20/HumanWork-Protocol" target="_blank" rel="noopener noreferrer" className="block text-white/40 hover:text-white transition-colors text-sm">GitHub</a>
                <a href="#" className="block text-white/40 hover:text-white transition-colors text-sm">Smart Contracts</a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-medium mb-4 text-sm uppercase tracking-wider">Community</h4>
              <div className="space-y-3">
                <a href="#" className="block text-white/40 hover:text-white transition-colors text-sm">Discord</a>
                <a href="#" className="block text-white/40 hover:text-white transition-colors text-sm">Twitter</a>
                <a href="#" className="block text-white/40 hover:text-white transition-colors text-sm">Blog</a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-sm">
              © {new Date().getFullYear()} HumanWork Protocol. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-white/30 text-sm">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
