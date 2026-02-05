import { normalize } from 'path';
import apiClient from './client';

export interface WalletInfo {
  availableCredits: number;
  totalCredits?: number;
  usedCredits?: number;
}

export interface WalletInfoResponse {
  availableCredits: number;
  totalCredits?: number;
  usedCredits?: number;
}

/**
 * Fetch wallet information with retry logic for 503 errors
 */
export const getWalletInfo = async (
  workspaceId: string,
  retryCount = 0,
  maxRetries = 2
): Promise<WalletInfo> => {
  try {
    const response = await apiClient.get<WalletInfoResponse>(
      `/wallet/info/?workspaceId=${workspaceId}`
      , null,
      {
        noErrorAlert: true
      }
    );

    return {
      availableCredits: response.data.availableCredits || 0,
      totalCredits: response.data.totalCredits,
      usedCredits: response.data.usedCredits,
    };
  } catch (error: any) {
    // Retry on 503 errors
    if (error.code === 503 && retryCount < maxRetries) {
      const delay = 500 * (retryCount + 1);
      console.log(`Wallet API 503, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return getWalletInfo(workspaceId, retryCount + 1, maxRetries);
    }

    throw error;
  }
};
