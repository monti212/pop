/**
 * Image Validator Utility
 *
 * Validates images before upload to prevent inappropriate content.
 * Includes client-side checks and provides hooks for server-side moderation.
 */

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

// Allowed image formats for educational use
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

// Maximum file size: 10MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Maximum dimensions to prevent extremely large images
const MAX_IMAGE_DIMENSION = 8000;

// Minimum dimensions to ensure quality
const MIN_IMAGE_DIMENSION = 50;

/**
 * Validates image file type and size
 */
export const validateImageFile = (file: File): ImageValidationResult => {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return {
      isValid: true, // Not an image, skip validation
      warnings: []
    };
  }

  // Check allowed formats
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Image format ${file.type} is not supported. Please use JPG, PNG, GIF, WebP, or SVG.`
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `Image size (${sizeMB}MB) exceeds the maximum allowed size of 10MB. Please compress or resize the image.`
    };
  }

  // Check minimum size (likely corrupted or empty file)
  if (file.size < 100) {
    return {
      isValid: false,
      error: 'Image file appears to be corrupted or empty.'
    };
  }

  return {
    isValid: true,
    warnings: []
  };
};

/**
 * Validates image dimensions
 */
export const validateImageDimensions = async (file: File): Promise<ImageValidationResult> => {
  // Skip if not an image
  if (!file.type.startsWith('image/')) {
    return { isValid: true };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Check maximum dimensions
      if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
        resolve({
          isValid: false,
          error: `Image dimensions (${img.width}x${img.height}) exceed maximum allowed size of ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}. Please resize the image.`
        });
        return;
      }

      // Check minimum dimensions
      if (img.width < MIN_IMAGE_DIMENSION || img.height < MIN_IMAGE_DIMENSION) {
        resolve({
          isValid: false,
          error: `Image dimensions (${img.width}x${img.height}) are too small. Minimum size is ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION}.`
        });
        return;
      }

      // Check aspect ratio (prevent extremely stretched images)
      const aspectRatio = img.width / img.height;
      if (aspectRatio > 10 || aspectRatio < 0.1) {
        resolve({
          isValid: false,
          error: 'Image has an unusual aspect ratio. Please use a more standard image format.'
        });
        return;
      }

      resolve({
        isValid: true
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        isValid: false,
        error: 'Unable to load image. The file may be corrupted.'
      });
    };

    img.src = objectUrl;
  });
};

/**
 * Performs basic image content analysis using browser APIs
 * This is a lightweight check that can catch some obviously problematic images
 */
export const performBasicImageAnalysis = async (file: File): Promise<ImageValidationResult> => {
  // Skip if not an image
  if (!file.type.startsWith('image/')) {
    return { isValid: true };
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        // Create canvas to analyze image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({ isValid: true, warnings: ['Could not analyze image content'] });
          return;
        }

        // Resize to small size for analysis
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);

        try {
          const imageData = ctx.getImageData(0, 0, 100, 100);
          const data = imageData.data;

          // Calculate average brightness
          let totalBrightness = 0;
          let skinTonePixels = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Calculate brightness
            const brightness = (r + g + b) / 3;
            totalBrightness += brightness;

            // Detect potential skin tone (very basic heuristic)
            // This is NOT a reliable NSFW detector, just a warning flag
            if (r > 95 && g > 40 && b > 20 && r > g && r > b &&
                Math.abs(r - g) > 15 && data[i] > data[i + 1] &&
                data[i] > data[i + 2]) {
              skinTonePixels++;
            }
          }

          const avgBrightness = totalBrightness / (data.length / 4);
          const skinTonePercentage = (skinTonePixels / (data.length / 4)) * 100;

          const warnings: string[] = [];

          // Very basic heuristic - high percentage of skin tones might indicate portraits or people
          // This is NOT a reliable content filter, just an educational content guideline
          if (skinTonePercentage > 60) {
            warnings.push('This image appears to contain a high proportion of human subjects. Please ensure it is appropriate for educational use.');
          }

          // Check if image is too dark (might indicate poor quality)
          if (avgBrightness < 30) {
            warnings.push('Image appears very dark. Consider using a clearer, better-lit image.');
          }

          resolve({
            isValid: true,
            warnings: warnings.length > 0 ? warnings : undefined
          });
        } catch (error) {
          // Canvas security error - likely a cross-origin image
          resolve({ isValid: true });
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          isValid: false,
          error: 'Unable to analyze image content.'
        });
      };

      img.src = objectUrl;
    });
  } catch (error) {
    return {
      isValid: true,
      warnings: ['Could not perform image analysis']
    };
  }
};

/**
 * Complete image validation pipeline
 * This runs all validation checks in sequence
 */
export const validateImage = async (file: File): Promise<ImageValidationResult> => {
  // Skip if not an image
  if (!file.type.startsWith('image/')) {
    return { isValid: true };
  }

  // Step 1: Validate file format and size
  const fileValidation = validateImageFile(file);
  if (!fileValidation.isValid) {
    return fileValidation;
  }

  // Step 2: Validate dimensions
  const dimensionValidation = await validateImageDimensions(file);
  if (!dimensionValidation.isValid) {
    return dimensionValidation;
  }

  // Step 3: Perform basic content analysis
  const contentValidation = await performBasicImageAnalysis(file);

  // Combine warnings from all steps
  const allWarnings = [
    ...(fileValidation.warnings || []),
    ...(dimensionValidation.warnings || []),
    ...(contentValidation.warnings || [])
  ];

  return {
    isValid: contentValidation.isValid,
    error: contentValidation.error,
    warnings: allWarnings.length > 0 ? allWarnings : undefined
  };
};

/**
 * Validates multiple images
 */
export const validateImages = async (files: File[]): Promise<{
  validFiles: File[];
  invalidFiles: { file: File; error: string }[];
  warnings: { file: File; warnings: string[] }[];
}> => {
  const validFiles: File[] = [];
  const invalidFiles: { file: File; error: string }[] = [];
  const warnings: { file: File; warnings: string[] }[] = [];

  for (const file of files) {
    const result = await validateImage(file);

    if (!result.isValid) {
      invalidFiles.push({
        file,
        error: result.error || 'Unknown validation error'
      });
    } else {
      validFiles.push(file);
      if (result.warnings && result.warnings.length > 0) {
        warnings.push({
          file,
          warnings: result.warnings
        });
      }
    }
  }

  return { validFiles, invalidFiles, warnings };
};

/**
 * Content Policy Guidelines
 * These should be displayed to users before upload
 */
export const IMAGE_CONTENT_POLICY = {
  title: 'Image Upload Guidelines',
  description: 'To maintain a safe educational environment, please ensure your images meet these guidelines:',
  rules: [
    'Images must be appropriate for educational use',
    'No nudity, sexually explicit, or suggestive content',
    'No violent, graphic, or disturbing content',
    'No hate symbols, discriminatory, or offensive imagery',
    'No personal information or sensitive data visible in images',
    'Images should be clear, well-lit, and professionally appropriate',
    'Use of copyrighted images should comply with educational fair use'
  ],
  acceptableExamples: [
    'Educational diagrams and charts',
    'Classroom materials and worksheets',
    'Historical or scientific photographs',
    'Student work samples (with appropriate permissions)',
    'Presentation slides and visual aids'
  ]
};
