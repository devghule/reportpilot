// Opens a popup for an OAuth flow and resolves with the payload the backend's
// bridge page posts back via window.postMessage, matching the given type.
export function openOAuthPopup<T>(url: string, expectedType: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const popup = window.open(url, 'reportpilot-oauth', 'width=480,height=640');
    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === expectedType) {
        window.removeEventListener('message', handleMessage);
        clearInterval(pollClosed);
        resolve(data.payload as T);
      } else if (data.type === `${expectedType.replace('success', 'error')}`) {
        window.removeEventListener('message', handleMessage);
        clearInterval(pollClosed);
        reject(new Error(data.payload?.message ?? 'Authentication failed.'));
      }
    };
    window.addEventListener('message', handleMessage);

    const pollClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollClosed);
        window.removeEventListener('message', handleMessage);
      }
    }, 500);
  });
}
