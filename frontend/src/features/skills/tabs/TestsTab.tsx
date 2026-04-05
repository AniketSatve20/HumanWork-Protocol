import { motion } from 'framer-motion';
import { Code2, FileText, Filter, Search, Zap } from 'lucide-react';
import { Button } from '@/components/common';
import type { SkillCategory, SkillDifficulty } from '@/types';
import { SKILL_CATEGORIES, SKILL_DIFFICULTY_CONFIG } from '@/types';
import type { SkillTest } from '../model/types';

interface TestsTabProps {
  filteredTests: SkillTest[];
  isFreelancer: boolean;
  searchQuery: string;
  categoryFilter: SkillCategory | 'all';
  difficultyFilter: SkillDifficulty | 'all';
  onSetSearchQuery: (value: string) => void;
  onSetCategoryFilter: (value: SkillCategory | 'all') => void;
  onSetDifficultyFilter: (value: SkillDifficulty | 'all') => void;
  onTakeTest: (test: SkillTest) => void;
  getDifficultyStars: (difficulty: SkillDifficulty) => number;
}

export function TestsTab({
  filteredTests,
  isFreelancer,
  searchQuery,
  categoryFilter,
  difficultyFilter,
  onSetSearchQuery,
  onSetCategoryFilter,
  onSetDifficultyFilter,
  onTakeTest,
  getDifficultyStars,
}: TestsTabProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => onSetSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-surface-400" />
          <select
            value={categoryFilter}
            onChange={(e) => onSetCategoryFilter(e.target.value as SkillCategory | 'all')}
            className="input text-sm py-2"
          >
            <option value="all">All Categories</option>
            {SKILL_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>{category.icon} {category.label}</option>
            ))}
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => onSetDifficultyFilter(e.target.value as SkillDifficulty | 'all')}
            className="input text-sm py-2"
          >
            <option value="all">All Levels</option>
            {Object.entries(SKILL_DIFFICULTY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => onSetCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            categoryFilter === 'all'
              ? 'bg-surface-900 text-white border-surface-900'
              : 'bg-surface-50 text-surface-500 border-surface-200 hover:border-surface-300'
          }`}
        >
          All
        </button>
        {SKILL_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onSetCategoryFilter(category.id === categoryFilter ? 'all' : category.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              categoryFilter === category.id
                ? 'bg-surface-900 text-white border-surface-900'
                : 'bg-surface-50 text-surface-500 border-surface-200 hover:border-surface-300'
            }`}
          >
            {category.icon} {category.label}
          </button>
        ))}
      </div>

      {filteredTests.length === 0 ? (
        <div className="text-center py-16">
          <Code2 className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500 font-medium">No tests found</p>
          <p className="text-surface-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTests.map((test) => {
            const category = SKILL_CATEGORIES.find((c) => c.id === test.category);
            const difficulty = test.difficulty ? SKILL_DIFFICULTY_CONFIG[test.difficulty] : null;
            const stars = test.difficulty ? getDifficultyStars(test.difficulty) : 1;

            return (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="card card-hover p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {category && <span className="text-lg">{category.icon}</span>}
                    <span className={`text-xs font-medium ${category?.color || 'text-surface-500'}`}>
                      {category?.label || 'General'}
                    </span>
                  </div>
                  {difficulty && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${difficulty.bgColor} ${difficulty.borderColor} ${difficulty.color}`}>
                      {'★'.repeat(stars)}{'☆'.repeat(4 - stars)} {difficulty.label}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-surface-900 mb-1">{test.title}</h3>
                <p className="text-sm text-surface-500 mb-4 line-clamp-2 flex-1">{test.description}</p>

                <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                  <div className="flex items-center gap-3 text-xs text-surface-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {test.submissionCount} taken
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      {test.fee !== '0' ? `${(parseInt(test.fee, 10) / 1e6).toFixed(0)} USDC` : 'Free'}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => onTakeTest(test)} disabled={!isFreelancer}>
                    Take Test
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
