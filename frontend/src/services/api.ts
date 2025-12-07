// src/services/api.ts
import axios from 'axios';

// Point this to your running backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  projects: {
    /**
     * Uploads a file (PDF/Doc) to IPFS via the Backend.
     * Returns: The IPFS Hash (string)
     */
    uploadBrief: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file); // Must match backend 'upload.single("file")'

      const response = await axios.post(`${API_URL}/api/projects/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.ipfsHash;
    },

    // Fetch all projects for the dashboard
    getAll: async () => {
      const response = await axios.get(`${API_URL}/api/projects`);
      return response.data;
    }
  }
};