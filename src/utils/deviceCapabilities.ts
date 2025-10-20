interface DeviceCapabilities {
  memory: number;
  isLowEnd: boolean;
  maxFileSize: number;
  maxPdfPages: number;
  shouldDisableAnimations: boolean;
  shouldDisableParticles: boolean;
}

const getDeviceMemory = (): number => {
  if ('deviceMemory' in navigator) {
    return (navigator as any).deviceMemory || 4;
  }

  if (performance && (performance as any).memory) {
    const memoryInfo = (performance as any).memory;
    const totalMemoryGB = memoryInfo.jsHeapSizeLimit / (1024 * 1024 * 1024);
    return Math.round(totalMemoryGB * 2);
  }

  return 4;
};

export const detectDeviceCapabilities = (): DeviceCapabilities => {
  const memory = getDeviceMemory();
  const isLowEnd = memory < 4;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const isSlowCPU = hardwareConcurrency < 4;

  const maxFileSize = isLowEnd ? 50 * 1024 * 1024 : 100 * 1024 * 1024;

  const maxPdfPages = isLowEnd ? 20 : 50;

  const shouldDisableAnimations = prefersReducedMotion || isLowEnd;
  const shouldDisableParticles = prefersReducedMotion || isLowEnd || isSlowCPU;

  return {
    memory,
    isLowEnd,
    maxFileSize,
    maxPdfPages,
    shouldDisableAnimations,
    shouldDisableParticles,
  };
};

export const checkMemoryAvailable = (): boolean => {
  if (performance && (performance as any).memory) {
    const memoryInfo = (performance as any).memory;
    const usedPercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
    return usedPercent < 80;
  }
  return true;
};

export const shouldProcessFile = (fileSize: number): { allowed: boolean; reason?: string } => {
  const capabilities = detectDeviceCapabilities();

  if (fileSize > capabilities.maxFileSize) {
    return {
      allowed: false,
      reason: `File size exceeds limit for this device (${(capabilities.maxFileSize / (1024 * 1024)).toFixed(0)}MB). Consider using a more powerful device or reducing the file size.`
    };
  }

  if (!checkMemoryAvailable()) {
    return {
      allowed: false,
      reason: 'Device memory is running low. Please close other apps or tabs and try again.'
    };
  }

  return { allowed: true };
};
