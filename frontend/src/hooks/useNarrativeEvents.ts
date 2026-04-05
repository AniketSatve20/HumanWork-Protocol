import { useEffect } from 'react';
import { Contract, type ContractRunner } from 'ethers';
import gsap from 'gsap';

// Replace with your actual ABIs
import ProjectEscrowABI from '../abis/ProjectEscrow.json';
import DisputeJuryABI from '../abis/DisputeJury.json';

const PROJECT_ESCROW_ADDRESS = '0x3C14...';
const DISPUTE_JURY_ADDRESS = '0x3bB6...';

type NarrativeEventArgs = {
  projectId?: string | number | bigint;
  [key: string]: unknown;
};

interface NarrativeContractEvent {
  args?: NarrativeEventArgs;
}

interface UseNarrativeEventsArgs {
  provider?: ContractRunner | null;
  onMilestoneCompleted?: (args?: NarrativeEventArgs) => void;
  onDisputeOpened?: (args?: NarrativeEventArgs) => void;
}

export function useNarrativeEvents({ provider, onMilestoneCompleted, onDisputeOpened }: UseNarrativeEventsArgs) {
  useEffect(() => {
    if (!provider) return;
    const escrow = new Contract(PROJECT_ESCROW_ADDRESS, ProjectEscrowABI, provider);
    const jury = new Contract(DISPUTE_JURY_ADDRESS, DisputeJuryABI, provider);

    // Listen for MilestoneCompleted
    const handleMilestoneCompleted = (...args: unknown[]) => {
      const event = args[args.length - 1] as NarrativeContractEvent | undefined;
      const eventArgs = event?.args;
      onMilestoneCompleted?.(eventArgs);
      if (eventArgs?.projectId === undefined) return;

      const branchSelector = `#branch-${String(eventArgs.projectId)}`;
      // Example: trigger GSAP growth animation
      gsap.to(branchSelector, { scale: 1.2, duration: 0.7, yoyo: true, repeat: 1, ease: 'power2.out' });
    };
    escrow.on('MilestoneCompleted', handleMilestoneCompleted);

    // Listen for DisputeOpened
    const handleDisputeOpened = (...args: unknown[]) => {
      const event = args[args.length - 1] as NarrativeContractEvent | undefined;
      const eventArgs = event?.args;
      onDisputeOpened?.(eventArgs);
      if (eventArgs?.projectId === undefined) return;

      const branchSelector = `#branch-${String(eventArgs.projectId)}`;
      // Example: trigger GSAP flicker animation
      gsap.to(branchSelector, {
        filter: 'drop-shadow(0 0 8px #8B0000)',
        background: '#8B0000',
        repeat: 6,
        yoyo: true,
        duration: 0.08,
        onComplete: () => {
          gsap.to(branchSelector, { filter: '', background: '', duration: 0.2 });
        },
      });
    };
    jury.on('DisputeOpened', handleDisputeOpened);

    return () => {
      escrow.off('MilestoneCompleted', handleMilestoneCompleted);
      jury.off('DisputeOpened', handleDisputeOpened);
    };
  }, [provider, onMilestoneCompleted, onDisputeOpened]);
}
