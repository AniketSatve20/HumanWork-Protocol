import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api.service';
import { web3Service } from '@/services/web3.service';
import { config } from '@/utils/config';
import type { Submission, SkillTest, ViewMode } from '../model/types';

interface UseSkillSubmissionParams {
  address?: string;
  selectedTest: SkillTest | null;
  submissionContent: string;
  setSubmissions: React.Dispatch<React.SetStateAction<Submission[]>>;
  loadData: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
}

interface UseSkillSubmissionReturn {
  isSubmitting: boolean;
  handleSubmit: () => Promise<void>;
  stopPolling: () => void;
}

export function useSkillSubmission({
  address,
  selectedTest,
  submissionContent,
  setSubmissions,
  loadData,
  setViewMode,
}: UseSkillSubmissionParams): UseSkillSubmissionReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = () => {
    stopPolling();

    pollingRef.current = setInterval(async () => {
      if (!address) return;

      try {
        const res = await apiService.getSubmissionHistory(address, { limit: 5 });
        const data = res as { submissions?: Submission[]; data?: { submissions?: Submission[] } };
        const latestSubs = data.submissions || data.data?.submissions || [];

        let justGraded = false;

        setSubmissions((prev) => {
          justGraded = latestSubs.some(
            (incoming) =>
              incoming.status === 2 &&
              prev.some((old) => old.submissionId === incoming.submissionId && old.status !== 2)
          );

          const merged = [...latestSubs];
          prev.forEach((p) => {
            if (!merged.find((m) => m.submissionId === p.submissionId)) {
              merged.push(p);
            }
          });

          return merged;
        });

        if (justGraded) {
          toast.success('Your submission has been graded!');
          stopPolling();
          void loadData();
        }
      } catch {
        // Keep polling on transient network errors.
      }
    }, 5000);
  };

  const handleSubmit = async () => {
    if (!selectedTest || !submissionContent.trim() || !address) return;

    setIsSubmitting(true);

    try {
      toast.loading('Uploading to IPFS...', { id: 'skill-submit' });

      const uploadRes = await apiService.submitSkillTest(selectedTest.id, submissionContent, {
        category: selectedTest.category,
        difficulty: selectedTest.difficulty,
        testTitle: selectedTest.title,
      });

      const data = uploadRes as { cid?: string; data?: { cid?: string } };
      const cid = data.cid || data.data?.cid;
      if (!cid) throw new Error('Failed to upload submission');

      const feeWei = selectedTest.fee && selectedTest.fee !== '0' ? BigInt(selectedTest.fee) : 0n;

      if (feeWei > 0n) {
        toast.loading('Approving USDC payment...', { id: 'skill-submit' });

        try {
          const usdcContract = web3Service.getContract('usdc');
          const allowance = usdcContract
            ? await usdcContract.allowance(address, config.contracts.skillTrial)
            : 0n;

          if (!allowance || BigInt(allowance) < feeWei) {
            const approveTx = await web3Service.approveUSDC(config.contracts.skillTrial, feeWei);
            await approveTx.wait();
            toast.loading('USDC approved! Submitting on-chain...', { id: 'skill-submit' });
          }
        } catch (approveErr) {
          console.error('USDC approval failed:', approveErr);
          toast.error('USDC approval failed. Make sure you have enough USDC.', { id: 'skill-submit' });
          setIsSubmitting(false);
          return;
        }
      }

      toast.loading('Submitting on-chain...', { id: 'skill-submit' });

      try {
        const tx = await web3Service.submitSkillTest(selectedTest.id, cid);
        await tx.wait();
        toast.success('Submitted! AI grading in progress...', { id: 'skill-submit' });
      } catch (chainErr) {
        const errorMessage = chainErr instanceof Error ? chainErr.message : '';

        if (errorMessage.includes('user rejected') || errorMessage.includes('ACTION_REJECTED')) {
          toast.error('Transaction rejected', { id: 'skill-submit' });
          setIsSubmitting(false);
          return;
        }

        console.error('On-chain submission failed:', chainErr);
        toast.error('On-chain submission failed — your content was saved to IPFS. Please try again.', {
          id: 'skill-submit',
        });
        setIsSubmitting(false);
        return;
      }

      setViewMode('results');
      startPolling();
      await loadData();
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to submit test', { id: 'skill-submit' });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return { isSubmitting, handleSubmit, stopPolling };
}
