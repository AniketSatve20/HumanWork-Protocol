import { useState } from 'react';
import { ethers, BrowserProvider, Contract } from 'ethers';
import { Upload, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config/contracts';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function CreateProject() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  
  // Form State
  const [freelancer, setFreelancer] = useState('');
  const [briefFile, setBriefFile] = useState<File | null>(null);
  const [milestones, setMilestones] = useState([{ description: '', amount: '' }]);

  // Helper to add a new milestone row
  const addMilestone = () => {
    setMilestones([...milestones, { description: '', amount: '' }]);
  };

  // === MAIN SUBMIT LOGIC ===
  const handleSubmit = async () => {
    try {
      if (!window.ethereum) throw new Error("No crypto wallet found. Please install MetaMask.");
      if (!briefFile) throw new Error("Please upload a project brief.");
      
      setLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // --- STEP 1: Upload Brief to IPFS ---
      setStatusMsg("Uploading Project Brief to IPFS...");
      const ipfsHash = await api.projects.uploadBrief(briefFile);
      console.log("IPFS Hash:", ipfsHash);

      // Prepare data for Blockchain
      // We attach the IPFS hash to the first milestone description for reference
      const descriptions = milestones.map((m, i) => 
        i === 0 ? `[Brief:${ipfsHash}] ${m.description}` : m.description
      );
      
      // Convert User Input (e.g. "100") to USDC Units (e.g. 100000000 if 6 decimals)
      // Assuming USDC has 6 decimals on Hedera Testnet
      const amounts = milestones.map(m => ethers.parseUnits(m.amount || '0', 6));
      const totalAmount = amounts.reduce((a, b) => a + b, 0n);

      // --- STEP 2: Approve USDC ---
      setStatusMsg("Please Approve USDC in your Wallet...");
      const usdcContract = new Contract(CONTRACT_ADDRESSES.USDC, CONTRACT_ABIS.USDC, signer);
      
      const approveTx = await usdcContract.approve(CONTRACT_ADDRESSES.PROJECT_ESCROW, totalAmount);
      setStatusMsg("Waiting for Approval Transaction...");
      await approveTx.wait();

      // --- STEP 3: Create Project on Blockchain ---
      setStatusMsg("Creating Project on Hedera Testnet...");
      const escrowContract = new Contract(CONTRACT_ADDRESSES.PROJECT_ESCROW, CONTRACT_ABIS.PROJECT_ESCROW, signer);
      
      const createTx = await escrowContract.createProject(freelancer, amounts, descriptions);
      setStatusMsg("Confirming Project Creation...");
      await createTx.wait();

      alert("Project Created Successfully!");
      navigate('/dashboard'); 

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Transaction Failed");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 text-white">
      <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
      <p className="text-gray-400 mb-8">Secure your funds in escrow and start working.</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-6">
        
        {/* Freelancer Address Input */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Freelancer Wallet Address</label>
          <input
            type="text"
            value={freelancer}
            onChange={(e) => setFreelancer(e.target.value)}
            placeholder="0x..."
            className="w-full bg-black border border-gray-700 rounded-lg p-3 focus:border-purple-500 outline-none"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Project Brief</label>
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-gray-800 transition cursor-pointer relative">
             <Upload className="w-8 h-8 text-gray-500 mb-2" />
             <p className="text-sm text-gray-400">{briefFile ? briefFile.name : "Click to Upload PDF/Doc"}</p>
             <input 
               type="file" 
               className="absolute inset-0 opacity-0 cursor-pointer" 
               onChange={(e) => setBriefFile(e.target.files?.[0] || null)}
             />
          </div>
        </div>

        {/* Milestones */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Milestones & Payments</label>
          {milestones.map((ms, i) => (
            <div key={i} className="flex gap-4 mb-3">
              <input
                type="text"
                placeholder="Deliverable Description"
                value={ms.description}
                onChange={(e) => {
                  const newMs = [...milestones];
                  newMs[i].description = e.target.value;
                  setMilestones(newMs);
                }}
                className="flex-1 bg-black border border-gray-700 rounded-lg p-3 outline-none"
              />
              <div className="relative w-32">
                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  placeholder="0.00"
                  value={ms.amount}
                  onChange={(e) => {
                    const newMs = [...milestones];
                    newMs[i].amount = e.target.value;
                    setMilestones(newMs);
                  }}
                  className="w-full bg-black border border-gray-700 rounded-lg p-3 pl-8 outline-none"
                />
              </div>
            </div>
          ))}
          <button onClick={addMilestone} className="text-purple-400 text-sm hover:underline">+ Add Milestone</button>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 ${
            loading ? "bg-gray-700 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-500"
          }`}
        >
          {loading ? <Loader2 className="animate-spin" /> : <CheckCircle />}
          {loading ? statusMsg : "Initialize Escrow"}
        </button>

      </div>
    </div>
  );
}