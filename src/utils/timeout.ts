export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: string = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
    )
  ]);
};

export const AUTH_TIMEOUT = 5000;
export const DATABASE_TIMEOUT = 5000;
