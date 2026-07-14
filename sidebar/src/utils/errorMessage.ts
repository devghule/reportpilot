import axios from 'axios';

// AxiosError satisfies `instanceof Error`, but its own `.message` is a
// generic string like "Request failed with status code 400" — the actual
// backend-provided message (GlobalExceptionFilter's `{ message }` body) is
// in `err.response.data.message`. Several screens used to check only
// `instanceof Error`, silently discarding the real, actionable message the
// backend sent. This is the one place that distinction should be made.
export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const backendMessage = err.response?.data?.message;
    if (typeof backendMessage === 'string' && backendMessage.length > 0) {
      return backendMessage;
    }
    return fallback;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
