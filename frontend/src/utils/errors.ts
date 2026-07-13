export function getFriendlyApiError(err: any, defaultMessage: string = 'An unexpected error occurred.'): string {
  // If it's a simple string, return it
  if (typeof err === 'string') return err;

  // Extract from axios/fetch response structures
  const status = err?.status ?? err?.response?.status ?? 0;
  const detail = err?.response?.data?.detail ?? err?.message ?? '';

  // Auth/Session specific mapping (like we have in parseSyncError)
  if (status === 503) {
    return 'Service unavailable. Please try again later.';
  }
  if (status === 401) {
    if (detail.includes('expired')) return 'Session expired. Please sign in again.';
    if (detail.includes('invalid')) return 'Invalid session token. Please sign in again.';
    return 'Unauthorized. Please sign in again.';
  }
  
  if (status === 500) {
    return 'An internal server error occurred. We are looking into it.';
  }
  
  if (status === 429) {
      return 'You are doing that too fast. Please slow down.';
  }

  // If the backend actually returned a friendly string in `detail`, we can use it.
  // But if it's a raw exception string (e.g. contains "Exception", "Error:"), we obscure it.
  if (typeof detail === 'string' && detail.trim() !== '') {
    const lowerDetail = detail.toLowerCase();
    if (
        lowerDetail.includes('exception') || 
        lowerDetail.includes('traceback') || 
        lowerDetail.includes('internal error')
    ) {
        return defaultMessage;
    }
    return detail;
  }

  return defaultMessage;
}
