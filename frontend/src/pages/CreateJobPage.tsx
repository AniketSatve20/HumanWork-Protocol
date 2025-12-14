import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Trash2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button, Card, Input, Textarea, Badge } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { web3Service } from '@/services/web3.service';
import { apiService } from '@/services/api.service';
import { parseUSDC } from '@/utils/helpers';
import { config } from '@/utils/config';
import toast from 'react-hot-toast';

const categories = [
  'Web Development',
  'Mobile Development',
  'Smart Contracts',
  'UI/UX Design',
  'Data Science',
  'DevOps',
  'Technical Writing',
  'Other',
];

const popularSkills = [
  'React', 'TypeScript', 'Solidity', 'Node.js', 'Python',
  'Rust', 'Go', 'AWS', 'Docker', 'GraphQL', 'PostgreSQL',
  'MongoDB', 'Figma', 'TailwindCSS', 'Web3.js', 'Ethers.js',
];

interface Milestone {
  description: string;
  amount: string;
}

export function CreateJobPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [step, setStep] = useState<'details' | 'milestones' | 'review'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [duration, setDuration] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([
    { description: '', amount: '' },
  ]);
  const [freelancerAddress, setFreelancerAddress] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalBudget = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);

  const validateDetails = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (title.length < 10) newErrors.title = 'Title must be at least 10 characters';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (description.length < 50) newErrors.description = 'Description must be at least 50 characters';
    if (!category) newErrors.category = 'Category is required';
    if (skills.length === 0) newErrors.skills = 'At least one skill is required';
    if (!duration) newErrors.duration = 'Duration is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateMilestones = () => {
    const newErrors: Record<string, string> = {};
    milestones.forEach((m, i) => {
      if (!m.description.trim()) newErrors[`milestone_${i}_desc`] = 'Description required';
      if (!m.amount || parseFloat(m.amount) <= 0) newErrors[`milestone_${i}_amount`] = 'Valid amount required';
    });
    if (!freelancerAddress.trim()) newErrors.freelancer = 'Freelancer address is required';
    if (freelancerAddress && !freelancerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      newErrors.freelancer = 'Invalid Ethereum address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
    setCustomSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleAddMilestone = () => {
    setMilestones([...milestones, { description: '', amount: '' }]);
  };

  const handleRemoveMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const handleMilestoneChange = (index: number, field: keyof Milestone, value: string) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const handleContinue = () => {
    if (step === 'details' && validateDetails()) {
      setStep('milestones');
    } else if (step === 'milestones' && validateMilestones()) {
      setStep('review');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const ipfsResponse = await apiService.createJob({
        title,
        description,
        category,
        skills,
        milestones: milestones.map(m => ({
          description: m.description,
          amount: m.amount,
        })),
      });

      if (!ipfsResponse.success || !ipfsResponse.data?.ipfsHash) {
        throw new Error('Failed to upload job to IPFS');
      }

      const totalAmount = parseUSDC(totalBudget.toString());
      
      toast.loading('Approving USDC...', { id: 'approve' });
      const approveTx = await web3Service.approveUSDC(config.contracts.projectEscrow, totalAmount);
      await approveTx.wait();
      toast.success('USDC approved!', { id: 'approve' });

      toast.loading('Creating project...', { id: 'create' });
      const milestoneAmounts = milestones.map(m => parseUSDC(m.amount));
      const milestoneDescriptions = milestones.map(m => m.description);
      
      const createTx = await web3Service.createProject(
        freelancerAddress,
        milestoneAmounts,
        milestoneDescriptions
      );
      await createTx.wait();
      toast.success('Project created successfully!', { id: 'create' });

      navigate('/jobs');
    } catch (error: unknown) {
      console.error('Failed to create job:', error);
      toast.error((error as Error).message || 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.role !== 'recruiter') {
    return (
      <div className="page-container">
        <Card className="p-8 text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-warning-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-900">Recruiter Access Only</h2>
          <p className="text-surface-600 mt-2">Only recruiters can post jobs.</p>
          <Button className="mt-4" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-surface-600 hover:text-surface-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-display font-bold text-surface-900">Post a New Job</h1>
      </div>

      <div className="flex items-center gap-4 mb-8">
        {['details', 'milestones', 'review'].map((s, index) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s ? 'bg-primary-500 text-white' : index < ['details', 'milestones', 'review'].indexOf(step) ? 'bg-success-500 text-white' : 'bg-surface-200 text-surface-600'
            }`}>
              {index < ['details', 'milestones', 'review'].indexOf(step) ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
            </div>
            <span className={`text-sm font-medium capitalize ${step === s ? 'text-primary-600' : 'text-surface-500'}`}>{s}</span>
            {index < 2 && <div className="flex-1 h-0.5 bg-surface-200 mx-2" />}
          </div>
        ))}
      </div>

      {step === 'details' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="p-6 space-y-6">
            <Input label="Job Title" placeholder="e.g., Build a DeFi Dashboard" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
            <Textarea label="Job Description" placeholder="Describe the project in detail..." value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} className="min-h-[150px]" />
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                <option value="">Select a category</option>
                {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
              {errors.category && <p className="text-sm text-error-500 mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Required Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {popularSkills.map((skill) => (
                  <button key={skill} type="button" onClick={() => skills.includes(skill) ? handleRemoveSkill(skill) : handleAddSkill(skill)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${skills.includes(skill) ? 'bg-primary-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>{skill}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Add custom skill..." value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill(customSkill))} className="input flex-1" />
                <Button variant="secondary" onClick={() => handleAddSkill(customSkill)}><Plus className="w-4 h-4" /></Button>
              </div>
              {skills.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{skills.map((skill) => (<Badge key={skill} variant="primary" className="gap-1">{skill}<button onClick={() => handleRemoveSkill(skill)}>×</button></Badge>))}</div>}
              {errors.skills && <p className="text-sm text-error-500 mt-1">{errors.skills}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Duration</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="input">
                <option value="">Select duration</option>
                <option value="Less than 1 week">Less than 1 week</option>
                <option value="1-2 weeks">1-2 weeks</option>
                <option value="2-4 weeks">2-4 weeks</option>
                <option value="1-2 months">1-2 months</option>
                <option value="3+ months">3+ months</option>
              </select>
              {errors.duration && <p className="text-sm text-error-500 mt-1">{errors.duration}</p>}
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleContinue}>Continue to Milestones</Button>
            </div>
          </Card>
        </motion.div>
      )}

      {step === 'milestones' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="p-6 space-y-6">
            <Input label="Freelancer Wallet Address" placeholder="0x..." value={freelancerAddress} onChange={(e) => setFreelancerAddress(e.target.value)} error={errors.freelancer} helperText="Enter the wallet address of the freelancer." />
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-surface-700">Project Milestones</label>
                <Button variant="ghost" size="sm" onClick={handleAddMilestone}><Plus className="w-4 h-4" />Add Milestone</Button>
              </div>
              <div className="space-y-4">
                {milestones.map((milestone, index) => (
                  <div key={index} className="p-4 bg-surface-50 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-surface-600">Milestone {index + 1}</span>
                      {milestones.length > 1 && <button onClick={() => handleRemoveMilestone(index)} className="text-surface-400 hover:text-error-500"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <input type="text" placeholder="Milestone description..." value={milestone.description} onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)} className="input" />
                      </div>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                        <input type="number" placeholder="Amount" value={milestone.amount} onChange={(e) => handleMilestoneChange(index, 'amount', e.target.value)} className="input pl-9" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-primary-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-primary-700">Total Budget</span>
                <span className="text-xl font-bold text-primary-700">${totalBudget.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setStep('details')}>Back</Button>
              <Button className="flex-1" onClick={handleContinue}>Review Job</Button>
            </div>
          </Card>
        </motion.div>
      )}

      {step === 'review' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="p-6 space-y-6">
            <h3 className="font-semibold text-surface-900">Review Your Job Posting</h3>
            <div className="space-y-4">
              <div className="p-4 bg-surface-50 rounded-xl"><p className="text-sm text-surface-500">Title</p><p className="font-medium text-surface-900">{title}</p></div>
              <div className="p-4 bg-surface-50 rounded-xl"><p className="text-sm text-surface-500">Description</p><p className="text-surface-900">{description}</p></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-surface-50 rounded-xl"><p className="text-sm text-surface-500">Category</p><p className="font-medium text-surface-900">{category}</p></div>
                <div className="p-4 bg-surface-50 rounded-xl"><p className="text-sm text-surface-500">Duration</p><p className="font-medium text-surface-900">{duration}</p></div>
              </div>
              <div className="p-4 bg-surface-50 rounded-xl"><p className="text-sm text-surface-500 mb-2">Freelancer</p><p className="font-mono text-sm text-surface-900">{freelancerAddress}</p></div>
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="text-sm text-surface-500 mb-3">Milestones</p>
                <div className="space-y-2">
                  {milestones.map((m, i) => (<div key={i} className="flex items-center justify-between"><span className="text-surface-700">{m.description}</span><span className="font-semibold">${m.amount}</span></div>))}
                  <div className="flex items-center justify-between pt-2 border-t border-surface-200"><span className="font-medium">Total</span><span className="text-lg font-bold text-primary-600">${totalBudget.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
            <div className="bg-warning-50 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0" />
                <p className="text-sm text-warning-600">You'll need to approve the USDC transfer to the escrow contract.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setStep('milestones')}>Back</Button>
              <Button className="flex-1" onClick={handleSubmit} isLoading={isSubmitting}>Post Job & Lock Funds</Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

export default CreateJobPage;
