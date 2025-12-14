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
} from 'lucide-react';
import { Button } from '@/components/common';
import { useAuthStore } from '@/context/authStore';

const features = [
  {
    icon: Shield,
    title: 'Secure Escrow',
    description: 'Funds held safely in smart contracts until milestones are approved.',
  },
  {
    icon: Zap,
    title: 'AI-Powered Matching',
    description: 'Advanced AI matches freelancers with perfect job opportunities.',
  },
  {
    icon: Award,
    title: 'Verified Skills',
    description: 'On-chain skill badges prove expertise with AI-graded assessments.',
  },
  {
    icon: Users,
    title: 'Human Verified',
    description: 'ZK-proof verification ensures you work with real humans.',
  },
];

const stats = [
  { value: '$2.5M+', label: 'Total Value Locked' },
  { value: '1,200+', label: 'Verified Freelancers' },
  { value: '450+', label: 'Projects Completed' },
  { value: '99%', label: 'Client Satisfaction' },
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-900 via-primary-900 to-surface-900">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-hero-pattern opacity-30" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-500/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-accent-400" />
                <span className="text-sm text-white/80">Powered by Hedera & AI</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white leading-tight">
                The Future of
                <span className="block text-gradient bg-gradient-to-r from-primary-400 to-accent-400">
                  Freelancing
                </span>
              </h1>
              
              <p className="mt-6 text-lg text-white/70 max-w-xl">
                A decentralized B2B marketplace where verified humans connect, 
                collaborate, and get paid securely through smart contracts.
              </p>
              
              <div className="mt-8 flex flex-wrap gap-4">
                <Button
                  onClick={handleGetStarted}
                  isLoading={isConnecting}
                  size="lg"
                  className="bg-white text-primary-600 hover:bg-white/90"
                >
                  <Wallet className="w-5 h-5" />
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-white border border-white/20 hover:bg-white/10"
                  onClick={() => navigate('/jobs')}
                >
                  Explore Jobs
                </Button>
              </div>

              <div className="mt-12 flex items-center gap-8">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <img
                      key={i}
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`}
                      alt=""
                      className="w-10 h-10 rounded-full border-2 border-surface-900"
                    />
                  ))}
                </div>
                <div>
                  <p className="text-white font-semibold">1,200+ Verified Users</p>
                  <p className="text-white/60 text-sm">Join our growing community</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl blur-2xl opacity-30" />
                <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                  <div className="space-y-6">
                    {/* Mock Dashboard Preview */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                          <span className="text-white font-bold text-xl">H</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold">Dashboard</p>
                          <p className="text-white/60 text-sm">Welcome back!</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-success-500/20 text-success-400 rounded-full text-sm">
                        Verified ✓
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-white/60 text-sm">Earnings</p>
                        <p className="text-2xl font-bold text-white mt-1">$12,450</p>
                        <p className="text-success-400 text-sm">+23% this month</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-white/60 text-sm">Active Jobs</p>
                        <p className="text-2xl font-bold text-white mt-1">5</p>
                        <p className="text-accent-400 text-sm">2 pending review</p>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-white/60 text-sm mb-3">Recent Activity</p>
                      <div className="space-y-3">
                        {['Milestone approved - $2,500', 'New job match found', 'Skill badge earned'].map((activity, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-accent-500" />
                            <p className="text-white/80 text-sm">{activity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl font-display font-bold text-gradient">
                  {stat.value}
                </p>
                <p className="mt-2 text-surface-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-surface-900">
              Why Choose HumanWork?
            </h2>
            <p className="mt-4 text-lg text-surface-600">
              Built on blockchain technology with AI-powered features for a 
              seamless freelancing experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card card-hover p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-surface-900">{feature.title}</h3>
                <p className="mt-2 text-surface-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-surface-900">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-surface-600">
              Get started in minutes and start earning or hiring.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Connect & Verify',
                description: 'Connect your wallet and verify your identity with our human verification system.',
                icon: Wallet,
              },
              {
                step: '02',
                title: 'Find or Post Jobs',
                description: 'Browse available jobs or post your project with milestone-based payments.',
                icon: Globe,
              },
              {
                step: '03',
                title: 'Collaborate & Earn',
                description: 'Work securely with escrow protection and get paid instantly on approval.',
                icon: CheckCircle2,
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                <div className="text-6xl font-display font-bold text-surface-100 absolute -top-4 -left-2">
                  {item.step}
                </div>
                <div className="relative pt-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                    <item.icon className="w-7 h-7 text-primary-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-surface-900">{item.title}</h3>
                  <p className="mt-2 text-surface-600">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-10" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent-500/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
              Ready to Transform Your Freelancing?
            </h2>
            <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
              Join thousands of verified professionals on the most secure 
              freelancing platform built on blockchain.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button
                onClick={handleGetStarted}
                isLoading={isConnecting}
                size="lg"
                className="bg-white text-primary-600 hover:bg-white/90"
              >
                <Wallet className="w-5 h-5" />
                Start Now
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg font-display">H</span>
              </div>
              <span className="font-display font-bold text-xl text-white">HumanWork</span>
            </div>
            
            <div className="flex items-center gap-8">
              <a href="#" className="text-surface-400 hover:text-white transition-colors">About</a>
              <a href="#" className="text-surface-400 hover:text-white transition-colors">Docs</a>
              <a href="#" className="text-surface-400 hover:text-white transition-colors">GitHub</a>
              <a href="#" className="text-surface-400 hover:text-white transition-colors">Discord</a>
            </div>
            
            <p className="text-surface-500 text-sm">
              © 2024 HumanWork Protocol. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
