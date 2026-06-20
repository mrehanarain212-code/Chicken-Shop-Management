/**
 * Safe confirm utility for sandboxed iframe environments.
 * If the browser blocks or auto-dismisses native window.confirm (returning false instantly),
 * this falls back to true to avoid locking out the end-user from critical operations.
 */
export const safeConfirm = (message: string): boolean => {
  const start = Date.now();
  let result = false;
  try {
    result = window.confirm(message);
  } catch (e) {
    console.warn("Native confirm threw an error, falling back to true", e);
    return true; // proceed if it throws a security error
  }
  const elapsed = Date.now() - start;
  // If it returned in under 50ms, the browser blocked or auto-dismissed it.
  if (elapsed < 50) {
    console.warn("Native window.confirm was blocked or auto-dismissed in sandboxed iframe. Falling back to true.");
    return true;
  }
  return result;
};
