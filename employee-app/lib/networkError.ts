/** Detect transport / server failures suitable for offline QR queueing. */
export function isNetworkishError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err && typeof err === 'object' && 'status' in err) {
    const status = Number((err as { status?: unknown }).status);
    if (status === 0 || status >= 500) return true;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('network request failed')
    );
  }
  return false;
}
