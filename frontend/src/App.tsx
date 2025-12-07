import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { HomePage } from './components/pages/HomePage';
import { SkillsPage } from './components/pages/SkillsPage';
import { ProjectsPage } from './components/pages/ProjectsPage';
import { CreateProjectPage } from './components/pages/CreateProjectPage';
import { DashboardPage } from './components/pages/DashboardPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/create" element={<CreateProject />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
      <footer className="bg-white border-t border-gray-100 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>HumanWork Protocol © 2024 | Built on Hedera</p>
          <p className="mt-2">Powered by Filecoin/IPFS • Hugging Face AI</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
