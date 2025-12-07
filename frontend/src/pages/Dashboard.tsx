import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  LayoutDashboard, DollarSign, AlertTriangle, Briefcase, 
  ArrowUpRight, Plus 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, projectsData] = await Promise.all([
          api.projects.getStats().catch(() => ({ data: null })), // Fail gracefully
          api.projects.getAll()
        ]);
        
        if (statsData?.data) setStats(statsData.data);
        setProjects(projectsData.projects || []);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Format chart data from the backend object
  const chartData = stats ? [
    { name: 'Active', value: stats.projectCountsByStatus['1'] || 0, color: '#3b82f6' },
    { name: 'Completed', value: stats.projectCountsByStatus['3'] || 0, color: '#10b981' },
    { name: 'Disputed', value: stats.projectCountsByStatus['2'] || 0, color: '#ef4444' },
  ] : [];

  if (loading) return <div className="p-10 text-white">Loading Dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="text-purple-500" /> 
            Protocol Overview
          </h1>
          <p className="text-gray-400">Real-time metrics from Hedera Testnet</p>
        </div>
        <button 
          onClick={() => navigate('/create')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" /> Create Project
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          icon={<DollarSign className="w-6 h-6 text-green-400" />}
          label="Total Value Locked"
          value={`$${stats?.totalValueLocked || '0.00'}`}
          subtext="In Escrow Contracts"
        />
        <StatCard 
          icon={<Briefcase className="w-6 h-6 text-blue-400" />}
          label="Total Projects"
          value={stats?.totalProjects || '0'}
          subtext="All time volume"
        />
        <StatCard 
          icon={<AlertTriangle className="w-6 h-6 text-red-400" />}
          label="Dispute Rate"
          value={stats?.disputeRate || '0%'}
          subtext="AI Resolved"
        />
        <StatCard 
          icon={<ArrowUpRight className="w-6 h-6 text-purple-400" />}
          label="Avg. Freelancer Score"
          value={stats?.averageFreelancerScore || 'N/A'}
          subtext="Based on Skill Trials"
        />
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Projects List */}
        <div className="lg:col-span-2 bg-[#1a1b23] border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Recent Projects</h2>
          <div className="space-y-4">
            {projects.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No projects found.</p>
            ) : (
              projects.slice(0, 5).map((p: any) => (
                <div key={p.projectId || p._id} className="flex items-center justify-between p-4 bg-[#13141b] rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                  <div>
                    <h3 className="text-white font-medium">{p.title || `Project #${p.projectId}`}</h3>
                    <p className="text-sm text-gray-400">
                      Client: {p.client ? `${p.client.slice(0, 6)}...${p.client.slice(-4)}` : 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white font-mono">${p.totalAmount || '0'}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Analytics Chart */}
        <div className="bg-[#1a1b23] border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Project Status</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components
function StatCard({ icon, label, value, subtext }: any) {
  return (
    <div className="bg-[#1a1b23] border border-gray-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{label}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
        </div>
        <div className="p-3 bg-[#13141b] rounded-lg">{icon}</div>
      </div>
      <p className="text-xs text-gray-500">{subtext}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: number }) {
  const styles = {
    0: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", // Pending
    1: "bg-blue-500/10 text-blue-500 border-blue-500/20",       // Active
    2: "bg-red-500/10 text-red-500 border-red-500/20",         // Disputed
    3: "bg-green-500/10 text-green-500 border-green-500/20",     // Completed
  };
  // @ts-ignore
  const className = styles[status] || styles[0];
  const label = ["Pending", "Active", "Disputed", "Completed"][status] || "Unknown";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}