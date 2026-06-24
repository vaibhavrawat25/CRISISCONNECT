import { victimAPI } from '../api';

const OFFLINE_KEY = 'crisisconnect_offline_requests';

export const getOfflineRequests = () => {
  try {
    const data = localStorage.getItem(OFFLINE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse offline requests', e);
    return [];
  }
};

export const saveOfflineRequest = (requestData) => {
  const current = getOfflineRequests();
  const newRequest = {
    ...requestData,
    _id: `offline_${Date.now()}`,
    status: 'offline_pending',
    createdAt: new Date().toISOString(),
  };
  current.push(newRequest);
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(current));
  return newRequest;
};

export const clearOfflineRequests = () => {
  localStorage.removeItem(OFFLINE_KEY);
};

export const syncOfflineRequests = async (onSyncSuccess) => {
  const queued = getOfflineRequests();
  if (queued.length === 0) return;

  console.log(`Syncing ${queued.length} offline requests...`);
  let successCount = 0;
  let failedRequests = [];

  for (const req of queued) {
    try {
      // Strip temporary local fields before sending to API
      const { _id, status, createdAt, ...payload } = req;
      await victimAPI.submitRequest(payload);
      successCount++;
    } catch (err) {
      console.error('Failed to sync request:', req, err);
      failedRequests.push(req);
    }
  }

  // Update localStorage queue with only failed requests (if any)
  if (failedRequests.length > 0) {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(failedRequests));
  } else {
    clearOfflineRequests();
  }

  if (successCount > 0 && onSyncSuccess) {
    onSyncSuccess(successCount);
  }
};
