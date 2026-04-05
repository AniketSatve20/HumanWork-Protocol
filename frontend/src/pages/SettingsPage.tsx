import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Wallet,
  Bell,
  Shield,
  Eye,
  Save,
  Copy,
  Check,
  ExternalLink,
  Building2,
  BadgeCheck,
  Globe,
  Hash,
  MapPin,
  Users,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button, Card, Input, Textarea, Badge } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { copyToClipboard, generateAvatar, cn } from '@/utils/helpers';
import toast from 'react-hot-toast';
import type { CompanyDetails } from '@/types';

const getTabsForRole = (role?: string) => {
  const baseTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  ];
  if (role === 'recruiter') {
    baseTabs.splice(1, 0, { id: 'company', label: 'Company', icon: Building2 });
  }
  return baseTabs;
};

export function SettingsPage() {
  const { user, address, updateUser } = useAuthStore();
  const tabs = getTabsForRole(user?.role);
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [email, setEmail] = useState(user?.email || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [newSkill, setNewSkill] = useState('');

  // Company verification state (recruiter only)
  const [companyDetails, setCompanyDetails] = useState<Partial<CompanyDetails>>({
    companyName: user?.companyDetails?.companyName || user?.company || '',
    registrationNumber: user?.companyDetails?.registrationNumber || '',
    industry: user?.companyDetails?.industry || '',
    website: user?.companyDetails?.website || '',
    country: user?.companyDetails?.country || '',
    employeeCount: user?.companyDetails?.employeeCount || '',
    description: user?.companyDetails?.description || '',
  });
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    newMessages: true,
    milestoneUpdates: true,
    paymentReceived: true,
    jobMatches: true,
    marketing: false,
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateUser({ name, bio, email, skills });
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyAddress = async () => {
    if (address) {
      await copyToClipboard(address);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSubmitCompanyVerification = async () => {
    if (!companyDetails.companyName || !companyDetails.registrationNumber || !companyDetails.industry || !companyDetails.country) {
      toast.error('Please fill in all required fields');
      return;
    }
    setIsSubmittingCompany(true);
    try {
      const details: CompanyDetails = {
        companyName: companyDetails.companyName || '',
        registrationNumber: companyDetails.registrationNumber || '',
        industry: companyDetails.industry || '',
        website: companyDetails.website || '',
        country: companyDetails.country || '',
        employeeCount: companyDetails.employeeCount || '',
        description: companyDetails.description || '',
        verificationStatus: 'pending',
        submittedAt: new Date().toISOString(),
      };
      await updateUser({
        company: companyDetails.companyName,
        companyDetails: details,
      });
      toast.success('Company verification submitted! Our team will review your details.');
    } catch {
      toast.error('Failed to submit company verification');
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  return (
    <div className="page-container">
      <h1 className="text-2xl font-display font-bold text-surface-900 mb-8">Settings</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <Card className="p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-surface-600 hover:bg-surface-50'
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-surface-900 mb-6">Profile Information</h2>

                {/* Avatar */}
                <div className="flex items-center gap-6 mb-8">
                  <img
                    src={user?.avatar || generateAvatar(address || '')}
                    alt="Profile"
                    className="w-20 h-20 rounded-2xl ring-4 ring-surface-100"
                  />
                  <div>
                    <p className="font-medium text-surface-900">{user?.name}</p>
                    <Badge variant={user?.role === 'freelancer' ? 'primary' : 'accent'} className="mt-1">
                      {user?.role === 'freelancer' ? 'Freelancer' : 'Recruiter'}
                    </Badge>
                    <p className="text-sm text-surface-500 mt-2">
                      Avatar generated from your wallet address
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <Input
                    label="Display Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />

                  <Input
                    label="Email (Optional)"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    helperText="Used for important notifications only"
                  />

                  <Textarea
                    label="Bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                    className="min-h-[100px]"
                  />

                  {user?.role === 'freelancer' && (
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        Skills
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {skills.map((skill) => (
                          <Badge key={skill} variant="primary" className="gap-1">
                            {skill}
                            <button
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:text-error-500 ml-1"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          placeholder="Add a skill..."
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                        />
                        <Button variant="secondary" onClick={handleAddSkill}>
                          Add
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveProfile} isLoading={isSaving}>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ── Company Verification Tab (Recruiter Only) ── */}
          {activeTab === 'company' && user?.role === 'recruiter' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-surface-900">Company Verification</h2>
                    <p className="text-sm text-surface-500">
                      Verify your company to earn a trusted recruiter badge
                    </p>
                  </div>
                </div>

                {user?.companyDetails?.verificationStatus === 'verified' ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center mb-6">
                    <BadgeCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-surface-900 mb-1">Company Verified</h3>
                    <p className="text-sm text-surface-500 mb-3">
                      {user.companyDetails.companyName} is a verified company on HumanWork Protocol.
                    </p>
                    <Badge variant="success" className="gap-1">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Verified Recruiter
                    </Badge>
                  </div>
                ) : user?.companyDetails?.verificationStatus === 'pending' ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center mb-6">
                    <Loader2 className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-spin" />
                    <h3 className="text-lg font-semibold text-surface-900 mb-1">Verification In Progress</h3>
                    <p className="text-sm text-surface-500">
                      Your company details are being reviewed. This usually takes 1-2 business days.
                    </p>
                  </div>
                ) : null}

                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        <Building2 className="w-3.5 h-3.5 inline mr-1" />
                        Company Name *
                      </label>
                      <input
                        type="text"
                        value={companyDetails.companyName || ''}
                        onChange={(e) => setCompanyDetails({ ...companyDetails, companyName: e.target.value })}
                        placeholder="Acme Corp"
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        <Hash className="w-3.5 h-3.5 inline mr-1" />
                        Registration Number *
                      </label>
                      <input
                        type="text"
                        value={companyDetails.registrationNumber || ''}
                        onChange={(e) => setCompanyDetails({ ...companyDetails, registrationNumber: e.target.value })}
                        placeholder="e.g., CIN / GST / EIN"
                        className="input w-full"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        <FileText className="w-3.5 h-3.5 inline mr-1" />
                        Industry *
                      </label>
                      <select
                        value={companyDetails.industry || ''}
                        onChange={(e) => setCompanyDetails({ ...companyDetails, industry: e.target.value })}
                        className="input w-full"
                      >
                        <option value="">Select Industry</option>
                        <option value="technology">Technology</option>
                        <option value="finance">Finance & Banking</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="education">Education</option>
                        <option value="ecommerce">E-Commerce</option>
                        <option value="media">Media & Entertainment</option>
                        <option value="consulting">Consulting</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="real-estate">Real Estate</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        <MapPin className="w-3.5 h-3.5 inline mr-1" />
                        Country *
                      </label>
                      <input
                        type="text"
                        value={companyDetails.country || ''}
                        onChange={(e) => setCompanyDetails({ ...companyDetails, country: e.target.value })}
                        placeholder="e.g., United States"
                        className="input w-full"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        <Globe className="w-3.5 h-3.5 inline mr-1" />
                        Website
                      </label>
                      <input
                        type="url"
                        value={companyDetails.website || ''}
                        onChange={(e) => setCompanyDetails({ ...companyDetails, website: e.target.value })}
                        placeholder="https://company.com"
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1.5">
                        <Users className="w-3.5 h-3.5 inline mr-1" />
                        Employee Count
                      </label>
                      <select
                        value={companyDetails.employeeCount || ''}
                        onChange={(e) => setCompanyDetails({ ...companyDetails, employeeCount: e.target.value })}
                        className="input w-full"
                      >
                        <option value="">Select Size</option>
                        <option value="1-10">1-10</option>
                        <option value="11-50">11-50</option>
                        <option value="51-200">51-200</option>
                        <option value="201-500">201-500</option>
                        <option value="501-1000">501-1000</option>
                        <option value="1000+">1000+</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                      Company Description
                    </label>
                    <textarea
                      value={companyDetails.description || ''}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, description: e.target.value })}
                      placeholder="Brief description of your company and what you do..."
                      rows={3}
                      className="input w-full"
                    />
                  </div>

                  <div className="bg-surface-50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-primary-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-surface-900 text-sm">Why verify?</p>
                        <ul className="text-sm text-surface-500 space-y-1 mt-1">
                          <li>• Get a verified recruiter badge on your profile</li>
                          <li>• Build trust with freelancers</li>
                          <li>• Access verified talent pool with skill badges</li>
                          <li>• Priority support and enterprise features</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSubmitCompanyVerification}
                      isLoading={isSubmittingCompany}
                      disabled={user?.companyDetails?.verificationStatus === 'verified'}
                    >
                      <BadgeCheck className="w-4 h-4" />
                      {user?.companyDetails?.verificationStatus === 'pending'
                        ? 'Update Submission'
                        : 'Submit for Verification'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-surface-900 mb-6">Wallet Settings</h2>

                <div className="space-y-6">
                  <div className="p-4 bg-surface-50 rounded-xl">
                    <p className="text-sm text-surface-500 mb-2">Connected Wallet</p>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-surface-900">{address}</p>
                      <button
                        onClick={handleCopyAddress}
                        className="p-2 hover:bg-surface-200 rounded-lg transition-colors"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-success-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-surface-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-surface-50 rounded-xl">
                    <p className="text-sm text-surface-500 mb-2">Network</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success-500" />
                      <p className="font-medium text-surface-900">Hedera Testnet</p>
                    </div>
                  </div>

                  <div className="p-4 bg-surface-50 rounded-xl">
                    <p className="text-sm text-surface-500 mb-2">Human Verification</p>
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-success-500" />
                      <p className="font-medium text-surface-900">
                        {user?.isVerifiedHuman ? 'Verified Human' : 'Not Verified'}
                      </p>
                    </div>
                    {!user?.isVerifiedHuman && (
                      <Link
                        to="/kyc"
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                      >
                        <Shield className="w-4 h-4" />
                        Get Verified
                      </Link>
                    )}
                  </div>

                  <a
                    href={`https://hashscan.io/testnet/account/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary-500 hover:text-primary-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on HashScan
                  </a>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-surface-900 mb-6">Notification Preferences</h2>

                <div className="space-y-4">
                  {[
                    { key: 'newMessages', label: 'New Messages', desc: 'Get notified when you receive new messages' },
                    { key: 'milestoneUpdates', label: 'Milestone Updates', desc: 'Updates on milestone completion and approval' },
                    { key: 'paymentReceived', label: 'Payment Received', desc: 'Get notified when payments are processed' },
                    { key: 'jobMatches', label: 'Job Matches', desc: 'AI-powered job recommendations matching your skills' },
                    { key: 'marketing', label: 'Marketing & Updates', desc: 'Product updates and promotional content' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-surface-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-surface-900">{item.label}</p>
                        <p className="text-sm text-surface-500">{item.desc}</p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications({
                            ...notifications,
                            [item.key]: !notifications[item.key as keyof typeof notifications],
                          })
                        }
                        className={cn(
                          'relative w-12 h-6 rounded-full transition-colors',
                          notifications[item.key as keyof typeof notifications]
                            ? 'bg-primary-500'
                            : 'bg-surface-300'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                            notifications[item.key as keyof typeof notifications]
                              ? 'translate-x-7'
                              : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'privacy' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-surface-900 mb-6">Privacy & Security</h2>

                <div className="space-y-6">
                  <div className="p-4 bg-surface-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Eye className="w-5 h-5 text-surface-500" />
                      <p className="font-medium text-surface-900">Profile Visibility</p>
                    </div>
                    <p className="text-sm text-surface-500 mb-3">
                      Control who can see your profile information
                    </p>
                    <select className="input">
                      <option>Public - Anyone can view</option>
                      <option>Verified Users Only</option>
                      <option>Private - Only project participants</option>
                    </select>
                  </div>

                  <div className="p-4 bg-surface-50 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-5 h-5 text-surface-500" />
                      <p className="font-medium text-surface-900">Two-Factor Authentication</p>
                    </div>
                    <p className="text-sm text-surface-500 mb-3">
                      Add an extra layer of security with signature verification
                    </p>
                    <Badge variant="success">Enabled via Wallet</Badge>
                  </div>

                  <div className="p-4 bg-error-50 rounded-xl border border-error-200">
                    <p className="font-medium text-error-700 mb-2">Danger Zone</p>
                    <p className="text-sm text-error-600 mb-3">
                      Permanently delete your account and all associated data.
                    </p>
                    <Button variant="ghost" className="text-error-600 hover:bg-error-100">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
