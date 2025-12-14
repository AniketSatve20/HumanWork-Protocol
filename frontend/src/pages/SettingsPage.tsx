import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Wallet,
  Bell,
  Shield,
  Eye,
  Palette,
  Save,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Button, Card, Input, Textarea, Badge } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { formatAddress, copyToClipboard, generateAvatar, cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
];

export function SettingsPage() {
  const { user, address, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [email, setEmail] = useState(user?.email || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [newSkill, setNewSkill] = useState('');

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
      updateUser({ name, bio, email, skills });
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
