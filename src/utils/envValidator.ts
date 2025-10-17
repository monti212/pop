import { logger } from './logger';

interface EnvVariable {
  name: string;
  required: boolean;
  description: string;
}

const REQUIRED_ENV_VARIABLES: EnvVariable[] = [
  {
    name: 'VITE_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL'
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key for client-side authentication'
  },
  {
    name: 'VITE_SUPABASE_FUNCTIONS_URL',
    required: false,
    description: 'Supabase Functions URL (will be derived from VITE_SUPABASE_URL if not set)'
  }
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of REQUIRED_ENV_VARIABLES) {
    const value = import.meta.env[envVar.name];

    if (!value || value === '' || value.includes('your-') || value.includes('placeholder')) {
      if (envVar.required) {
        errors.push(`${envVar.name} is missing or invalid. ${envVar.description}`);
      } else {
        warnings.push(`${envVar.name} is not set. ${envVar.description}`);
      }
    }
  }

  if (errors.length > 0) {
    logger.error('🔧 Environment validation failed:');
    errors.forEach(error => logger.error(`  ❌ ${error}`));
    logger.error('');
    logger.error('To fix this:');
    logger.error('1. Create a .env file in your project root if it doesn\'t exist');
    logger.error('2. Copy the contents from .env.example');
    logger.error('3. Replace the placeholder values with your actual credentials');
    logger.error('4. Restart your development server');
  }

  if (warnings.length > 0) {
    logger.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => logger.warn(`  ⚠️  ${warning}`));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function deriveSupabaseFunctionsUrl(): string {
  const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;

  if (functionsUrl && !functionsUrl.includes('your-') && !functionsUrl.includes('placeholder')) {
    return functionsUrl;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl || !supabaseUrl.includes('.supabase.co')) {
    throw new Error('Cannot derive Functions URL: VITE_SUPABASE_URL is invalid');
  }

  try {
    const url = new URL(supabaseUrl);
    const projectRef = url.hostname.split('.')[0];
    const derivedUrl = `https://${projectRef}.functions.supabase.co`;

    logger.info(`ℹ️  Derived Functions URL from Supabase URL: ${derivedUrl}`);

    return derivedUrl;
  } catch (error) {
    throw new Error('Failed to parse VITE_SUPABASE_URL');
  }
}

export function logEnvironmentStatus(): void {
  logger.info('🔧 Environment Configuration Status:');
  logger.info(`  Supabase URL: ${import.meta.env.VITE_SUPABASE_URL ? '✓' : '✗'}`);
  logger.info(`  Supabase Anon Key: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓' : '✗'}`);
  logger.info(`  Functions URL: ${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ? '✓ (explicit)' : '⚠  (will derive)'}`);
  logger.info(`  Stripe Key: ${import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? '✓' : '✗ (optional)'}`);
}
