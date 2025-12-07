import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWalletStore } from '../../stores/walletStore';
import { contractService } from '../../services/contracts';

// ============ Types ============

interface Milestone {
  id: string;
  description: string;
  amount: string;
}

interface ProjectFormData {
  title: string;
  briefDescription: string;
  category: string;
  skills: string[];
  freelancerAddress: string;
  milestones: Milestone[];
  deadline: string;
}

type FormStep = 'details' | 'milestones' | 'review' | 'creating';

// ============ Constants ============

const CATEGORIES = [
  'Smart Contract Development',
  'Frontend Development',
  'Backend Development',
  'Full Stack Development',
  'Security Audit',
  'Technical Writing',
  'UI/UX Design',
  'DevOps',
  'Other',
];

const COMMON_SKILLS = [
  'Solidity',
  'React',
  'TypeScript',
  'Node.js',
  'Rust',
  'Python',
  'AWS',
  'Web3.js',
  'Ethers.js',
  'GraphQL',
  'MongoDB',
  'PostgreSQL',
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ============ Helper Functions ============

const generateId = () => Math.random().toString(36).substring(2, 9);

const formatUSDC = (amount: string): string => {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

// ============ Component ============

export function CreateProjectPage() {
  const { isConnected, address, provider, signer } = useWalletStore();
  
  // Form state
  const [step, setStep] = useState<FormStep>('details');
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    briefDescription: '',
    category: '',
    skills: [],
    freelancerAddress: '',
    milestones: [{ id: generateId(), description: '', amount: '' }],
    deadline: '',
  });
  
  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTx, setCurrentTx] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'registering' | 'creating' | 'success' | 'error'>('idle');
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [usdcAllowance, setUsdcAllowance] = useState<string>('0');
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);
  const [skillInput, setSkillInput] = useState('');

  // Calculate total amount
  const totalAmount = formData.milestones.reduce(
    (sum, m) => sum + (parseFloat(m.amount) || 0),
    0
  );

  // ============ Effects ============

  // Fetch USDC balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && address && provider && signer) {
        try {
          contractService.setProvider(provider, signer);
          const balance = await contractService.getUSDCBalance(address);
          setUsdcBalance(balance);
          
          // Also check allowance
          const escrowAddress = import.meta.env.VITE_PROJECT_ESCROW_ADDRESS;
          if (escrowAddress) {
            const usdc = new ethers.Contract(
              import.meta.env.VITE_USDC_ADDRESS,
              ['function allowance(address,address) view returns (uint256)'],
              provider
            );
            const allowance = await usdc.allowance(address, escrowAddress);
            setUsdcAllowance(ethers.formatUnits(allowance, 6));
          }
        } catch (error) {
          console.error('Failed to fetch USDC balance:', error);
        }
      }
    };
    fetchBalance();
  }, [isConnected, address, provider, signer]);

  // ============ Validation ============

  const validateDetails = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Project title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }
    
    if (!formData.briefDescription.trim()) {
      newErrors.briefDescription = 'Description is required';
    } else if (formData.briefDescription.length < 20) {
      newErrors.briefDescription = 'Description must be at least 20 characters';
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    
    if (!formData.freelancerAddress.trim()) {
      newErrors.freelancerAddress = 'Freelancer address is required';
    } else if (!isValidAddress(formData.freelancerAddress)) {
      newErrors.freelancerAddress = 'Invalid Ethereum address';
    } else if (formData.freelancerAddress.toLowerCase() === address?.toLowerCase()) {
      newErrors.freelancerAddress = 'Cannot assign project to yourself';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateMilestones = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (formData.milestones.length === 0) {
      newErrors.milestones = 'At least one milestone is required';
    }
    
    formData.milestones.forEach((m, i) => {
      if (!m.description.trim()) {
        newErrors[`milestone_${i}_desc`] = 'Description required';
      }
      if (!m.amount || parseFloat(m.amount) <= 0) {
        newErrors[`milestone_${i}_amount`] = 'Valid amount required';
      }
    });
    
    if (totalAmount <= 0) {
      newErrors.totalAmount = 'Total amount must be greater than 0';
    }
    
    if (totalAmount > parseFloat(usdcBalance)) {
      newErrors.totalAmount = `Insufficient USDC balance. You have ${formatUSDC(usdcBalance)} USDC`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============ Milestone Handlers ============

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, { id: generateId(), description: '', amount: '' }],
    }));
  };

  const removeMilestone = (id: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== id),
    }));
  };

  const updateMilestone = (id: string, field: 'description' | 'amount', value: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m =>
        m.id === id ? { ...m, [field]: value } : m
      ),
    }));
  };

  // ============ Skill Handlers ============

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !formData.skills.includes(trimmed)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  // ============ Form Submit ============

  const handleSubmit = async () => {
    if (!provider || !signer || !address) {
      setErrors({ general: 'Please connect your wallet' });
      return;
    }

    setIsSubmitting(true);
    setStep('creating');
    setTxStatus('idle');
    setErrors({});

    try {
      contractService.setProvider(provider, signer);
      const escrowAddress = import.meta.env.VITE_PROJECT_ESCROW_ADDRESS;

      // Step 1: Register metadata with backend
      setTxStatus('registering');
      try {
        const metadataResponse = await fetch(`${API_BASE_URL}/api/projects/register-metadata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: address,
            freelancer: formData.freelancerAddress,
            title: formData.title,
            briefDescription: formData.briefDescription,
            category: formData.category,
            skills: formData.skills,
            deadline: formData.deadline || undefined,
          }),
        });
        
        if (!metadataResponse.ok) {
          console.warn('Failed to register metadata, continuing anyway...');
        } else {
          const metadataResult = await metadataResponse.json();
          console.log('Metadata registered:', metadataResult);
        }
      } catch (metadataError) {
        console.warn('Backend metadata registration failed, continuing:', metadataError);
      }

      // Step 2: Check and approve USDC if needed
      const requiredAllowance = ethers.parseUnits(totalAmount.toString(), 6);
      const currentAllowance = ethers.parseUnits(usdcAllowance, 6);

      if (currentAllowance < requiredAllowance) {
        setTxStatus('approving');
        console.log('Approving USDC...');
        
        const approveTx = await contractService.approveUSDC(
          escrowAddress,
          totalAmount.toString()
        );
        setCurrentTx(approveTx.hash);
        console.log('USDC approved:', approveTx.hash);
      }

      // Step 3: Create project on-chain
      setTxStatus('creating');
      console.log('Creating project on-chain...');
      
      const receipt = await contractService.createProject(
        formData.freelancerAddress,
        formData.milestones.map(m => m.amount),
        formData.milestones.map(m => m.description)
      );
      
      setCurrentTx(receipt.hash);
      console.log('Project created:', receipt.hash);

      // Step 4: Extract project ID from event logs
      const escrowContract = new ethers.Contract(
        escrowAddress,
        ['event ProjectCreated(uint256 indexed projectId, address indexed client, address indexed freelancer, uint256 totalAmount)'],
        provider
      );
      
      const logs = receipt.logs;
      let projectId: number | null = null;
      
      for (const log of logs) {
        try {
          const parsed = escrowContract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed?.name === 'ProjectCreated') {
            projectId = Number(parsed.args.projectId);
            break;
          }
        } catch {
          // Skip logs that don't match
        }
      }

      setCreatedProjectId(projectId);
      setTxStatus('success');
      
    } catch (error: any) {
      console.error('Failed to create project:', error);
      setTxStatus('error');
      
      if (error.code === 'ACTION_REJECTED') {
        setErrors({ general: 'Transaction rejected by user' });
      } else if (error.message?.includes('insufficient funds')) {
        setErrors({ general: 'Insufficient HBAR for gas fees' });
      } else if (error.message?.includes('transfer amount exceeds balance')) {
        setErrors({ general: 'Insufficient USDC balance' });
      } else {
        setErrors({ general: error.message || 'Failed to create project' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ Navigation ============

  const goToStep = (newStep: FormStep) => {
    if (newStep === 'milestones' && step === 'details') {
      if (!validateDetails()) return;
    }
    if (newStep === 'review' && step === 'milestones') {
      if (!validateMilestones()) return;
    }
    setStep(newStep);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      briefDescription: '',
      category: '',
      skills: [],
      freelancerAddress: '',
      milestones: [{ id: generateId(), description: '', amount: '' }],
      deadline: '',
    });
    setStep('details');
    setTxStatus('idle');
    setCurrentTx(null);
    setCreatedProjectId(null);
    setErrors({});
  };

  // ============ Render: Not Connected ============

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
        <p className="text-gray-600 mb-8">
          Please connect your wallet to create a new project.
        </p>
      </div>
    );
  }

  // ============ Render: Creating / Success / Error ============

  if (step === 'creating') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="card text-center">
          {txStatus === 'success' ? (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold mb-2 text-green-600">Project Created!</h2>
              {createdProjectId && (
                <p className="text-gray-600 mb-4">Project ID: #{createdProjectId}</p>
              )}
              {currentTx && (
                <a
                  href={`https://hashscan.io/testnet/transaction/${currentTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline mb-6 block"
                >
                  View on HashScan →
                </a>
              )}
              <div className="flex justify-center gap-4">
                <button onClick={resetForm} className="btn btn-secondary">
                  Create Another
                </button>
                <a href="/projects" className="btn btn-primary">
                  View Projects
                </a>
              </div>
            </>
          ) : txStatus === 'error' ? (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold mb-2 text-red-600">Transaction Failed</h2>
              {errors.general && (
                <p className="text-red-500 mb-4">{errors.general}</p>
              )}
              <button onClick={() => setStep('review')} className="btn btn-primary">
                Try Again
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold mb-4">Creating Project...</h2>
              
              <div className="space-y-4 text-left max-w-md mx-auto">
                <div className={`flex items-center gap-3 ${txStatus === 'registering' ? 'text-primary-600' : 'text-gray-400'}`}>
                  {txStatus === 'registering' ? '🔄' : '✓'} Registering metadata...
                </div>
                <div className={`flex items-center gap-3 ${txStatus === 'approving' ? 'text-primary-600' : txStatus === 'creating' || txStatus === 'success' ? 'text-gray-400' : 'text-gray-300'}`}>
                  {txStatus === 'approving' ? '🔄' : txStatus === 'creating' || txStatus === 'success' ? '✓' : '○'} Approving USDC...
                </div>
                <div className={`flex items-center gap-3 ${txStatus === 'creating' ? 'text-primary-600' : 'text-gray-300'}`}>
                  {txStatus === 'creating' ? '🔄' : '○'} Creating project on-chain...
                </div>
              </div>

              {currentTx && (
                <a
                  href={`https://hashscan.io/testnet/transaction/${currentTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline mt-4 block text-sm"
                >
                  View transaction →
                </a>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ============ Render: Form Steps ============

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
        <p className="text-gray-600">
          Set up a milestone-based project with secure escrow payments.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {['details', 'milestones', 'review'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step === s
                  ? 'bg-primary-600 text-white'
                  : ['details', 'milestones', 'review'].indexOf(step) > i
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <div
                className={`w-24 h-1 ${
                  ['details', 'milestones', 'review'].indexOf(step) > i
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="flex justify-center gap-16 mb-8 text-sm">
        <span className={step === 'details' ? 'text-primary-600 font-medium' : 'text-gray-500'}>
          Project Details
        </span>
        <span className={step === 'milestones' ? 'text-primary-600 font-medium' : 'text-gray-500'}>
          Milestones
        </span>
        <span className={step === 'review' ? 'text-primary-600 font-medium' : 'text-gray-500'}>
          Review
        </span>
      </div>

      {/* Balance Display */}
      <div className="card mb-6 bg-gradient-to-r from-primary-50 to-primary-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Your USDC Balance</p>
            <p className="text-2xl font-bold text-primary-700">{formatUSDC(usdcBalance)} USDC</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Project Total</p>
            <p className={`text-2xl font-bold ${totalAmount > parseFloat(usdcBalance) ? 'text-red-600' : 'text-green-600'}`}>
              {formatUSDC(totalAmount.toString())} USDC
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {errors.general}
        </div>
      )}

      {/* Step 1: Project Details */}
      {step === 'details' && (
        <div className="card">
          <h2 className="text-xl font-bold mb-6">Project Details</h2>
          
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={`input ${errors.title ? 'border-red-500' : ''}`}
                placeholder="e.g., Smart Contract Audit for DeFi Protocol"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Brief Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.briefDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, briefDescription: e.target.value }))}
                className={`input min-h-[100px] ${errors.briefDescription ? 'border-red-500' : ''}`}
                placeholder="Describe the project scope, deliverables, and requirements..."
              />
              {errors.briefDescription && <p className="text-red-500 text-sm mt-1">{errors.briefDescription}</p>}
              <p className="text-gray-500 text-sm mt-1">{formData.briefDescription.length}/500 characters</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className={`input ${errors.category ? 'border-red-500' : ''}`}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium mb-2">Required Skills</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.skills.map(skill => (
                  <span
                    key={skill}
                    className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="text-primary-500 hover:text-primary-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill(skillInput);
                    }
                  }}
                  className="input flex-1"
                  placeholder="Type a skill and press Enter"
                />
                <button
                  onClick={() => addSkill(skillInput)}
                  className="btn btn-secondary"
                  type="button"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {COMMON_SKILLS.filter(s => !formData.skills.includes(s)).slice(0, 6).map(skill => (
                  <button
                    key={skill}
                    onClick={() => addSkill(skill)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                    type="button"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Freelancer Address */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Freelancer Wallet Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.freelancerAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, freelancerAddress: e.target.value }))}
                className={`input font-mono ${errors.freelancerAddress ? 'border-red-500' : ''}`}
                placeholder="0x..."
              />
              {errors.freelancerAddress && <p className="text-red-500 text-sm mt-1">{errors.freelancerAddress}</p>}
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium mb-2">Deadline (Optional)</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                className="input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <button onClick={() => goToStep('milestones')} className="btn btn-primary">
              Continue to Milestones →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Milestones */}
      {step === 'milestones' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Define Milestones</h2>
            <button onClick={addMilestone} className="btn btn-secondary text-sm">
              + Add Milestone
            </button>
          </div>

          {errors.milestones && (
            <p className="text-red-500 text-sm mb-4">{errors.milestones}</p>
          )}

          <div className="space-y-4">
            {formData.milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className="border rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-700">
                    Milestone {index + 1}
                  </span>
                  {formData.milestones.length > 1 && (
                    <button
                      onClick={() => removeMilestone(milestone.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={milestone.description}
                      onChange={(e) => updateMilestone(milestone.id, 'description', e.target.value)}
                      className={`input ${errors[`milestone_${index}_desc`] ? 'border-red-500' : ''}`}
                      placeholder="What will be delivered in this milestone?"
                    />
                    {errors[`milestone_${index}_desc`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`milestone_${index}_desc`]}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Amount (USDC)</label>
                    <input
                      type="number"
                      value={milestone.amount}
                      onChange={(e) => updateMilestone(milestone.id, 'amount', e.target.value)}
                      className={`input ${errors[`milestone_${index}_amount`] ? 'border-red-500' : ''}`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    {errors[`milestone_${index}_amount`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`milestone_${index}_amount`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="mt-6 p-4 bg-primary-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Project Value:</span>
              <span className="text-2xl font-bold text-primary-700">
                {formatUSDC(totalAmount.toString())} USDC
              </span>
            </div>
            {errors.totalAmount && (
              <p className="text-red-500 text-sm mt-2">{errors.totalAmount}</p>
            )}
          </div>

          <div className="flex justify-between mt-8">
            <button onClick={() => setStep('details')} className="btn btn-secondary">
              ← Back
            </button>
            <button onClick={() => goToStep('review')} className="btn btn-primary">
              Review Project →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <div className="card">
          <h2 className="text-xl font-bold mb-6">Review Your Project</h2>

          <div className="space-y-6">
            {/* Project Info */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Project Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Title</p>
                  <p className="font-medium">{formData.title}</p>
                </div>
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium">{formData.category}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Description</p>
                  <p className="font-medium">{formData.briefDescription}</p>
                </div>
                {formData.skills.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Required Skills</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.skills.map(skill => (
                        <span key={skill} className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {formData.deadline && (
                  <div>
                    <p className="text-gray-500">Deadline</p>
                    <p className="font-medium">{new Date(formData.deadline).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Freelancer */}
            <div className="border-b pb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Freelancer</h3>
              <p className="font-mono text-sm bg-gray-100 px-3 py-2 rounded break-all">
                {formData.freelancerAddress}
              </p>
            </div>

            {/* Milestones */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Milestones</h3>
              <div className="space-y-2">
                {formData.milestones.map((m, i) => (
                  <div key={m.id} className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded">
                    <div>
                      <span className="text-gray-500 text-sm">#{i + 1}</span>
                      <span className="ml-2">{m.description}</span>
                    </div>
                    <span className="font-bold text-primary-600">{formatUSDC(m.amount)} USDC</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="bg-primary-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Total Amount:</span>
                <span className="text-2xl font-bold text-primary-700">
                  {formatUSDC(totalAmount.toString())} USDC
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                This amount will be transferred to the escrow contract and released to the freelancer
                as milestones are approved.
              </p>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button onClick={() => setStep('milestones')} className="btn btn-secondary">
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create Project & Fund Escrow'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateProjectPage;
