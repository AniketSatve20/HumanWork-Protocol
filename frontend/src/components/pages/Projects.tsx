import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWalletStore } from '../../stores/wallet.store';
import { getUserProjects } from '../../services/api.service';

interface Project {
  projectId: number;
  client: string;
  freelancer: string;
  totalAmount: string;
  amountPaid: string;
  status: number;
  milestones: {
    description: string;
    amount: string;
    status: number;
  }[];
}

const STATUS_LABELS = ['Active', 'Completed', 'Cancelled'];
const MILESTONE_STATUS = ['Pending', 'Completed', 'Approved', 'Disputed'];

export function Projects() {
  const { address } = useWalletStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'client' | 'freelancer'>('all');

  useEffect(() => {
    if (address) {
      loadProjects();
    }
  }, [address, filter]);

  const loadProjects = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      const role = filter === 'all' ? undefined : filter;
      const data = await getUserProjects(address, role);
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Connect your wallet to view projects</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600">Manage your escrow projects</p>
        </div>
        <Link to="/projects/create" className="btn-primary">
          Create Project
        </Link>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        {(['all', 'client', 'freelancer'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="text-center py-12">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold mb-2">No projects found</h3>
          <p className="text-gray-600 mb-4">Create your first project to get started</p>
          <Link to="/projects/create" className="btn-primary inline-block">
            Create Project
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.projectId} className="card hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Project #{project.projectId}</h3>
                  <p className="text-sm text-gray-500">
                    {address.toLowerCase() === project.client.toLowerCase()
                      ? `Freelancer: ${project.freelancer.slice(0, 8)}...`
                      : `Client: ${project.client.slice(0, 8)}...`}
                  </p>
                </div>
                <span
                  className={`badge ${
                    project.status === 0
                      ? 'badge-info'
                      : project.status === 1
                      ? 'badge-success'
                      : 'badge-error'
                  }`}
                >
                  {STATUS_LABELS[project.status]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Total Value</div>
                  <div className="font-semibold">${project.totalAmount} USDC</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Paid</div>
                  <div className="font-semibold">${project.amountPaid} USDC</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Milestones</div>
                  <div className="font-semibold">{project.milestones.length}</div>
                </div>
              </div>

              {/* Milestones Progress */}
              <div className="space-y-2">
                {project.milestones.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <span className="truncate max-w-xs">{m.description || `Milestone ${i + 1}`}</span>
                    <div className="flex items-center space-x-3">
                      <span>${m.amount} USDC</span>
                      <span
                        className={`badge ${
                          m.status === 2
                            ? 'badge-success'
                            : m.status === 1
                            ? 'badge-warning'
                            : m.status === 3
                            ? 'badge-error'
                            : 'badge-info'
                        }`}
                      >
                        {MILESTONE_STATUS[m.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <Link
                  to={`/projects/${project.projectId}`}
                  className="btn-secondary text-sm"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projects;
