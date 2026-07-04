// Promisified bridge to Apps Script's google.script.run.
// google.script.run is asynchronous and callback-based, not Promise-based —
// this wraps it so the rest of the app can use async/await.
export const runScript = <T>(fnName: string, payload?: unknown): Promise<T> => {
  return new Promise((resolve, reject) => {
    const gsRun = (window as any).google?.script?.run;
    if (!gsRun) {
      reject(new Error('google.script.run is not available outside Google Sheets.'));
      return;
    }
    gsRun
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      [fnName](payload);
  });
};
