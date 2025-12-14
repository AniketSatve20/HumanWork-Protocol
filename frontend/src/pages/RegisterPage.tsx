import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Building2,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  DollarSign,
  Shield,
  Zap,
} from 'lucide-react';
import { Button, Input } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import type { UserRole } from '@/types';

const roles = [
  {
    id: 'freelancer' as UserRole,
    title: 'Freelancer',
    description: 'Find jobs, showcase skills, and get paid for your work.',
    icon: User,
    color: 'primary',
    benefits: [
      'Access to verified job listings',
      'Secure milestone-based payments',
      'Build your on-chain reputation',
      'Earn skill badges with AI assessments',
    ],
  },
  {
    id: 'recruiter' as UserRole,
    title: 'Recruiter',
    description: 'Post jobs, hire talent, and manage projects securely.',
    icon: Building2,
    color: 'accent',
    benefits: [
      'Post jobs with escrow protection',
      'Access verified freelancers',
      'Milestone-based project management',
      'AI-powered dispute resolution',
    ],
  },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { address, register, isRegistering, error } = useAuthStore();
  
  const [step, setStep] = useState<'role' | 'profile'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) {
      setStep('profile');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setNameError('Please enter your name');
      return;
    }
    
    if (name.length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }

    if (!selectedRole) return;

    try {
      await register(selectedRole, name.trim());
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  if (!address) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-4xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'role' ? 'text-primary-600' : 'text-surface-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'role' ? 'bg-primary-500 text-white' : 'bg-surface-200 text-surface-600'
              }`}>
                1
              </div>
              <span className="font-medium">Choose Role</span>
            </div>
            <div className="w-16 h-0.5 bg-surface-200" />
            <div className={`flex items-center gap-2 ${step === 'profile' ? 'text-primary-600' : 'text-surface-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'profile' ? 'bg-primary-500 text-white' : 'bg-surface-200 text-surface-600'
              }`}>
                2
              </div>
              <span className="font-medium">Your Profile</span>
            </div>
          </div>
        </div>

        {step === 'role' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-center mb-10">
              <h1 className="text-3xl font-display font-bold text-surface-900">
                How will you use HumanWork?
              </h1>
              <p className="mt-2 text-surface-600">
                Select your role to get started. You can always change this later.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {roles.map((role) => {
                const isSelected = selectedRole === role.id;
                const Icon = role.icon;
                
                return (
                  <motion.div
                    key={role.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect(role.id)}
                    className={`relative cursor-pointer rounded-2xl p-6 border-2 transition-all duration-200 ${
                      isSelected
                        ? role.id === 'freelancer'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-accent-500 bg-accent-50'
                        : 'border-surface-200 bg-white hover:border-surface-300'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4">
                        <CheckCircle2 className={`w-6 h-6 ${
                          role.id === 'freelancer' ? 'text-primary-500' : 'text-accent-500'
                        }`} />
                      </div>
                    )}

                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                      role.id === 'freelancer'
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-accent-100 text-accent-600'
                    }`}>
                      <Icon className="w-7 h-7" />
                    </div>

                    <h3 className="text-xl font-semibold text-surface-900">{role.title}</h3>
                    <p className="mt-1 text-surface-600">{role.description}</p>

                    <ul className="mt-4 space-y-2">
                      {role.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-surface-600">
                          <CheckCircle2 className={`w-4 h-4 ${
                            role.id === 'freelancer' ? 'text-primary-500' : 'text-accent-500'
                          }`} />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleContinue}
                disabled={!selectedRole}
                size="lg"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-md mx-auto"
          >
            <div className="text-center mb-10">
              <h1 className="text-3xl font-display font-bold text-surface-900">
                Complete Your Profile
              </h1>
              <p className="mt-2 text-surface-600">
                Just a few more details to get you started.
              </p>
            </div>

            <div className="card p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Display Name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError('');
                  }}
                  error={nameError}
                />

                <div className="bg-surface-50 rounded-xl p-4">
                  <p className="text-sm text-surface-500 mb-2">Connected Wallet</p>
                  <p className="font-mono text-sm text-surface-700 break-all">{address}</p>
                </div>

                <div className="bg-primary-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary-500" />
                    <div>
                      <p className="font-medium text-primary-700">Human Verification</p>
                      <p className="text-sm text-primary-600">
                        You'll be verified automatically on registration.
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-error-50 text-error-600 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep('role')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isRegistering}
                    className="flex-1"
                  >
                    Create Account
                  </Button>
                </div>
              </form>
            </div>

            <p className="text-center mt-6 text-sm text-surface-500">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default RegisterPage;
