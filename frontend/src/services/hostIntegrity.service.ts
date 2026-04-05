import axios from 'axios';
import type { HostIntegrityReport } from '@/types/hostIntegrity';

export async function fetchHostIntegrity(address: string): Promise<HostIntegrityReport | null> {
  try {
    const res = await axios.get(`/api/ai/host-integrity/${address}`);
    if (res.data && res.data.success && res.data.data) {
      return res.data.data as HostIntegrityReport;
    }
    return null;
  } catch (e) {
    return null;
  }
}
