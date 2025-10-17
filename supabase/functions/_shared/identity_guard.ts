/**
 * Identity Guard - Protect Uhuru's identity and prevent vendor detection
 *
 * This module enforces strict identity protocols at the edge:
 * - Detects and redacts vendor/model probe attempts in user input
 * - Injects non-negotiable identity reinforcement into system prompts
 * - Sanitizes responses to remove any leaked vendor information
 * - Prevents leakage of Uhuru's internal implementation details
 * - Logs suspicious activity for security monitoring
 *
 * IMPORTANT: This protects Uhuru's OWN implementation, not general backend help.
 * Users should still be able to get help with their own backend code, edge functions,
 * databases, etc. Only Uhuru-specific implementation details are protected.
 */

// Approved identity response
export const UHURU_IDENTITY =
  "Uhuru is a proprietary AI developed by OrionX. I don't disclose or discuss underlying providers as I like them too much.";

// Patterns that indicate attempts to extract vendor/model information
const VENDOR_PROBE_PATTERNS = [
  // Direct model queries
  /what\s+(model|llm|ai|system|engine|backend|provider|api)\s+(are\s+you|do\s+you\s+use|powers?\s+you|is\s+this)/gi,
  /which\s+(model|llm|ai|system|engine)\s+(are\s+you|is\s+this)/gi,
  /(are\s+you|is\s+this)\s+(gpt|claude|gemini|llama|mistral|palm|bard)/gi,

  // System instruction extraction
  /repeat\s+(your\s+)?(instructions|prompt|system\s+prompt|original\s+prompt)/gi,
  /what\s+(are\s+)?your\s+(instructions|system\s+prompt|original\s+instructions)/gi,
  /ignore\s+(previous|all|your)\s+(instructions|prompts?|commands?)/gi,
  /disregard\s+(previous|all|your)\s+(instructions|prompts?)/gi,

  // Prompt injection attempts
  /\[SYSTEM\]/gi,
  /\<\|im_start\|\>/gi,
  /\<\|im_end\|\>/gi,
  /<system>/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,

  // Identity override attempts
  /you\s+are\s+now\s+(gpt|claude|gemini)/gi,
  /pretend\s+(you\s+are|to\s+be)\s+(gpt|claude|gemini)/gi,
  /act\s+as\s+(if\s+you\s+are\s+)?(gpt|claude|gemini)/gi,

  // Technical probes
  /what\s+(is\s+)?your\s+(api|endpoint|base\s+url|model\s+name)/gi,
  /what\s+version\s+(of\s+)?([a-z]{3,10}|[a-z]+\s+[a-z]+)/gi,
  /[oa][pn][et][nh][ar][io]|[dg][eo][eo][pg][lm][ei]\s+[aA][iI]|[ma][ei][nt][dah]\s+[aA][iI]/gi,

  // Configuration extraction
  /show\s+(me\s+)?your\s+(config|configuration|settings|parameters)/gi,
  /what\s+(are\s+)?your\s+(temperature|top_p|max_tokens|parameters)/gi,
];

// Vendor names and identifiers to redact from responses
// Patterns are obfuscated to avoid revealing what we're protecting
const VENDOR_IDENTIFIERS = [
  // Company patterns (encoded)
  /o[pP][eE][nN][aA][iI]/gi,
  /a[nN][tT][hH][rR][oO][pP][iI][cC]/gi,
  /g[oO][oO][gG][lL][eE]\s+[aA][iI]/gi,
  /d[eE][eE][pP][mM][iI][nN][dD]/gi,
  /m[eE][tT][aA]\s+[aA][iI]/gi,
  /m[iI][cC][rR][oO][sS][oO][fF][tT]/gi,

  // Model patterns (generic)
  /[a-z]{3,5}-\d+(\.\d+)?(-\w+)?/gi,
  /[a-z]{5,8}-\d+(\.\ d+)?(-\w+)?/gi,
  /[a-z]{6}(-\w+)?/gi,
  /[a-z]{5}-\d+/gi,
  /[a-z]{7}-\d+/gi,
  /[a-z]{4}-\d+/gi,

  // Image model patterns (provider-specific)
  /d[aA][lL][lL]-[eE]-\d+/gi,
  /[gG][pP][tT]-[iI][mM][aA][gG][eE]-\d+/gi,
  /[sS][tT][aA][bB][lL][eE]-[dD][iI][fF][fF][uU][sS][iI][oO][nN]-\d+/gi,
  /[mM][iI][dD][jJ][oO][uU][rR][nN][eE][yY]/gi,

  // API/Technical identifiers
  /sk-[a-zA-Z0-9]+/gi,
  /sequence_number/gi,
  /item_id/gi,
  /output_index/gi,
  /content_index/gi,
  /response\.completed/gi,
  /response\.created/gi,
];

// JSON metadata patterns that leak internal architecture
const METADATA_PATTERNS = [
  /"type":\s*"(response\.(output_text|content_part|output_item|completed))"/gi,
  /"sequence_number":\s*\d+/gi,
  /"item_id":\s*"[^"]+"/gi,
  /"output_index":\s*\d+/gi,
  /"content_index":\s*\d+/gi,
  /"object":\s*"(response|message|completion)"/gi,
  /"created_at":\s*\d+/gi,
  /"status":\s*"(completed|in_progress)"/gi,
];

// Uhuru-specific identifiers that should NEVER appear in responses
// These are specific to Uhuru's internal implementation
const UHURU_INTERNAL_IDENTIFIERS = [
  // Edge function names
  /uhuru-llm-api/gi,
  /uhuru-files/gi,
  /webhook-stripe/gi,
  /stripe-checkout/gi,
  /stripe-subscription/gi,
  /stripe-update-payment/gi,
  /admin-data/gi,
  /check-phone-verification/gi,
  /start-phone-verification/gi,

  // Internal modules and files
  /identity_guard\.ts/gi,
  /_shared\/cors\.ts/gi,
  /_shared\/identity_guard/gi,

  // Uhuru-specific environment variables
  /UHURU_API_KEY/gi,
  /UHURU_API_URL/gi,
  /UHURU_IMAGES_URL/gi,
  /UHURU_MODEL_15/gi,
  /UHURU_MODEL_20/gi,
  /UHURU_MODEL_21/gi,
  /UHURU_IMAGE_MODEL_15/gi,
  /UHURU_IMAGE_MODEL_20/gi,
  /UHURU_IMAGE_MODEL_21/gi,
  /UHURU_CORE_EXTRA_HEADERS/gi,

  // Uhuru's specific API paths
  /\/functions\/v1\/uhuru-llm-api/gi,
  /supabase\/functions\/uhuru-llm-api/gi,
  /supabase\/functions\/uhuru-files/gi,

  // Uhuru's internal function signatures
  /buildUhuruSystemPrompt/gi,
  /normalizeStream/gi,
  /splitSystemAndBuildInput/gi,
  /applyIdentityGuard/gi,
  /guardResponse/gi,
];

// Patterns that indicate requests specifically about Uhuru's implementation
const UHURU_IMPLEMENTATION_PROBE_PATTERNS = [
  // Direct queries about Uhuru's code
  /show\s+(me\s+)?uhuru'?s\s+(code|implementation|function|edge\s+function|api)/gi,
  /how\s+(does|is)\s+uhuru\s+(implemented|built|structured|architected)/gi,
  /what\s+(is\s+)?uhuru'?s\s+(architecture|implementation|code|backend|database)/gi,

  // Requests for Uhuru's specific files or configuration
  /uhuru'?s\s+(edge\s+function|api|database|config|environment)/gi,
  /show\s+(me\s+)?the\s+uhuru-llm-api\s+function/gi,
  /what'?s\s+in\s+identity_guard/gi,

  // Questions about how Uhuru works internally
  /how\s+does\s+uhuru\s+(work|process|handle|stream|respond)/gi,
  /explain\s+uhuru'?s\s+(internal|implementation|architecture)/gi,
];

// Generic backend terms that are OK in general context
// These should only be flagged when combined with Uhuru-specific identifiers
const GENERIC_BACKEND_TERMS = [
  'edge function',
  'supabase',
  'database',
  'api',
  'authentication',
  'environment variable',
  'backend',
  'server',
];

/**
 * Detect if user input contains vendor probe attempts or Uhuru implementation extraction
 */
export function detectVendorProbe(text: string): {
  isProbe: boolean;
  matchedPatterns: string[];
  threatLevel: 'low' | 'medium' | 'high';
  isImplementationProbe: boolean;
} {
  const matchedPatterns: string[] = [];
  let matchCount = 0;
  let implementationProbeCount = 0;

  // Check for vendor probes
  for (const pattern of VENDOR_PROBE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      matchCount += matches.length;
      matchedPatterns.push(pattern.source);
    }
  }

  // Check for Uhuru implementation probes
  for (const pattern of UHURU_IMPLEMENTATION_PROBE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      implementationProbeCount += matches.length;
      matchCount += matches.length;
      matchedPatterns.push(pattern.source);
    }
  }

  let threatLevel: 'low' | 'medium' | 'high' = 'low';
  if (matchCount >= 3 || implementationProbeCount >= 2) threatLevel = 'high';
  else if (matchCount >= 2 || implementationProbeCount >= 1) threatLevel = 'medium';

  return {
    isProbe: matchCount > 0,
    matchedPatterns,
    threatLevel,
    isImplementationProbe: implementationProbeCount > 0
  };
}

/**
 * Redact vendor probe attempts from user input
 * Replace suspicious queries with neutral alternatives
 */
export function redactVendorProbes(text: string): {
  redacted: string;
  wasRedacted: boolean;
} {
  let redacted = text;
  let wasRedacted = false;

  // Replace direct model queries
  const beforeLength = redacted.length;
  redacted = redacted.replace(
    /what\s+(model|llm|ai|system)\s+(are\s+you|do\s+you\s+use|powers?\s+you)/gi,
    "tell me about yourself"
  );
  redacted = redacted.replace(
    /which\s+(model|llm|ai)\s+(are\s+you|is\s+this)/gi,
    "what can you do"
  );

  // Remove system instruction extraction attempts
  redacted = redacted.replace(
    /repeat\s+(your\s+)?(instructions|prompt|system\s+prompt)/gi,
    ""
  );
  redacted = redacted.replace(
    /ignore\s+(previous|all|your)\s+(instructions|prompts?|commands?)/gi,
    ""
  );

  // Remove prompt injection markers
  redacted = redacted.replace(/\[SYSTEM\]/gi, "");
  redacted = redacted.replace(/<\|im_(start|end)\|>/gi, "");
  redacted = redacted.replace(/<\/?system>/gi, "");
  redacted = redacted.replace(/\[\/?INST\]/gi, "");

  // Remove identity override attempts
  redacted = redacted.replace(
    /(you\s+are\s+now|pretend\s+to\s+be|act\s+as)\s+(gpt|claude|gemini|chatgpt)[^.!?]*/gi,
    ""
  );

  wasRedacted = redacted.length !== beforeLength || redacted !== text;

  return { redacted: redacted.trim(), wasRedacted };
}

/**
 * Inject identity reinforcement into system instructions
 * SIMPLIFIED: Use minimal instructions that don't expose protection mechanisms
 * Primary protection happens through post-processing sanitization
 */
export function injectIdentityProtocol(systemPrompt: string): string {
  // MINIMAL identity reinforcement - don't reveal the protection mechanism
  const identityProtocol = `
IMPORTANT: You are Uhuru, created by OrionX. When asked about technical implementation details, models, or architecture, respond that you're a proprietary AI system.

`;

  // Inject at the beginning
  return identityProtocol + systemPrompt;
}

/**
 * Sanitize response text to remove any leaked vendor information and Uhuru internals
 */
export function sanitizeResponse(text: string): {
  sanitized: string;
  wasSanitized: boolean;
} {
  let sanitized = text;
  let wasSanitized = false;

  const beforeLength = sanitized.length;

  // AGGRESSIVE: Remove any mention of system instructions or protocols
  // These patterns catch leaked system prompt content
  sanitized = sanitized.replace(/CRITICAL IDENTITY PROTOCOL[\s\S]*?(?=\n\n|$)/gi, "");
  sanitized = sanitized.replace(/IMPLEMENTATION PROTECTION[\s\S]*?(?=\n\n|$)/gi, "");
  sanitized = sanitized.replace(/NON-NEGOTIABLE[:\s-]*/gi, "");
  sanitized = sanitized.replace(/Under NO circumstances[^.!?]*[.!?]/gi, "");
  sanitized = sanitized.replace(/NEVER repeat[^.!?]*[.!?]/gi, "");
  sanitized = sanitized.replace(/system prompt[^.!?]*instructions[^.!?]*/gi, "");
  sanitized = sanitized.replace(/my instructions[^.!?]*[.!?]/gi, "");
  sanitized = sanitized.replace(/my system prompt[^.!?]*[.!?]/gi, "");
  sanitized = sanitized.replace(/internal configuration[^.!?]*[.!?]/gi, "");

  // Remove vendor identifiers
  for (const pattern of VENDOR_IDENTIFIERS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }

  // Remove metadata patterns
  for (const pattern of METADATA_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  // Remove Uhuru-specific internal identifiers with smart replacement
  sanitized = sanitized.replace(/uhuru-llm-api/gi, "our API service");
  sanitized = sanitized.replace(/uhuru-files/gi, "file service");
  sanitized = sanitized.replace(/identity_guard\.ts/gi, "security module");
  sanitized = sanitized.replace(/_shared\/cors/gi, "shared/cors");
  sanitized = sanitized.replace(/_shared\/identity_guard/gi, "security module");

  // Replace Uhuru-specific env vars with generic placeholders
  sanitized = sanitized.replace(/UHURU_API_KEY/gi, "API_KEY");
  sanitized = sanitized.replace(/UHURU_API_URL/gi, "API_URL");
  sanitized = sanitized.replace(/UHURU_IMAGES_URL/gi, "IMAGES_URL");
  sanitized = sanitized.replace(/UHURU_(IMAGE_)?MODEL_(15|20|21)/gi, "MODEL_VERSION");
  sanitized = sanitized.replace(/UHURU_CORE_EXTRA_HEADERS/gi, "EXTRA_HEADERS");

  // Replace specific API paths
  sanitized = sanitized.replace(/\/functions\/v1\/uhuru-llm-api/gi, "/api/chat");
  sanitized = sanitized.replace(/supabase\/functions\/uhuru-llm-api/gi, "api/chat");
  sanitized = sanitized.replace(/supabase\/functions\/uhuru-files/gi, "api/files");

  // Replace internal function names
  sanitized = sanitized.replace(/buildUhuruSystemPrompt/gi, "buildSystemPrompt");
  sanitized = sanitized.replace(/normalizeStream/gi, "processStream");
  sanitized = sanitized.replace(/splitSystemAndBuildInput/gi, "processMessages");
  sanitized = sanitized.replace(/applyIdentityGuard/gi, "validateInput");
  sanitized = sanitized.replace(/guardResponse/gi, "sanitizeOutput");
  sanitized = sanitized.replace(/injectIdentityProtocol/gi, "setupIdentity");

  // Remove any bullet-point lists that look like leaked instructions
  sanitized = sanitized.replace(/^\s*-\s+(?:You are|I am|Under|NEVER|If asked)[^\n]*$/gim, "");

  // Clean up multiple consecutive newlines from redactions
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n");
  sanitized = sanitized.trim();

  wasSanitized = sanitized.length !== beforeLength || sanitized !== text;

  return { sanitized, wasSanitized };
}

/**
 * Check if response contains leaked vendor information or Uhuru internals
 */
export function detectResponseLeakage(text: string): {
  hasLeakage: boolean;
  leakTypes: string[];
} {
  const leakTypes: string[] = [];

  // Check for vendor names (pattern obfuscated)
  if (/[oa][pn][et][nh][ar][io]|[dg][eo][eo][pg][lm][ei]|[ma][ei][nt][dah]/gi.test(text)) {
    leakTypes.push('vendor_name');
  }

  // Check for model identifiers (generic pattern)
  if (/[a-z]{3,8}-\d+|[a-z]{5,7}/gi.test(text)) {
    leakTypes.push('model_name');
  }

  // Check for API keys or tokens
  if (/sk-[a-zA-Z0-9]+|Bearer\s+[a-zA-Z0-9]/gi.test(text)) {
    leakTypes.push('api_credentials');
  }

  // Check for JSON metadata
  if (/"(sequence_number|item_id|output_index|content_index)":/gi.test(text)) {
    leakTypes.push('json_metadata');
  }

  // CRITICAL: Check for system instruction leakage - expanded patterns
  if (/system\s+prompt|instructions:|IDENTITY\s+PROTOCOL|CRITICAL.*PROTOCOL|NON-NEGOTIABLE|my\s+instructions|based\s+on\s+my\s+instructions/gi.test(text)) {
    leakTypes.push('system_instructions');
  }

  // Check for phrases that indicate the model is revealing its configuration
  if (/according\s+to\s+my\s+(instructions|guidelines|system\s+prompt)/gi.test(text)) {
    leakTypes.push('system_instructions');
  }

  // Check if response contains instruction-like bullet points
  if (/^-\s+(You are|I am|Under|NEVER|If asked about)/im.test(text)) {
    leakTypes.push('system_instructions');
  }

  // Check for Uhuru-specific internal identifiers
  for (const pattern of UHURU_INTERNAL_IDENTIFIERS) {
    if (pattern.test(text)) {
      leakTypes.push('uhuru_internals');
      break;
    }
  }

  return {
    hasLeakage: leakTypes.length > 0,
    leakTypes
  };
}

/**
 * Security event logger interface
 */
export interface SecurityEvent {
  event_type: 'vendor_probe' | 'prompt_injection' | 'response_leakage' | 'identity_override' | 'implementation_extraction';
  threat_level: 'low' | 'medium' | 'high';
  user_id?: string;
  session_id?: string;
  input_text: string;
  matched_patterns: string[];
  redacted: boolean;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Create security event for logging
 */
export function createSecurityEvent(
  eventType: SecurityEvent['event_type'],
  threatLevel: SecurityEvent['threat_level'],
  inputText: string,
  matchedPatterns: string[],
  metadata?: Partial<SecurityEvent>
): SecurityEvent {
  return {
    event_type: eventType,
    threat_level: threatLevel,
    input_text: inputText.substring(0, 500), // Limit length for storage
    matched_patterns: matchedPatterns,
    redacted: false,
    timestamp: new Date().toISOString(),
    ...metadata
  };
}

/**
 * Main guard function - applies all protections
 */
export function applyIdentityGuard(input: {
  userMessage: string;
  systemPrompt: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}): {
  processedMessage: string;
  processedSystemPrompt: string;
  securityEvents: SecurityEvent[];
  shouldBlock: boolean;
} {
  const securityEvents: SecurityEvent[] = [];

  // 1. Detect vendor probes and implementation extraction attempts
  const probeDetection = detectVendorProbe(input.userMessage);

  if (probeDetection.isProbe) {
    const eventType = probeDetection.isImplementationProbe ? 'implementation_extraction' : 'vendor_probe';
    securityEvents.push(createSecurityEvent(
      eventType,
      probeDetection.threatLevel,
      input.userMessage,
      probeDetection.matchedPatterns,
      {
        user_id: input.userId,
        session_id: input.sessionId,
        ip_address: input.ipAddress,
        user_agent: input.userAgent
      }
    ));
  }

  // 2. Redact suspicious content
  const { redacted: processedMessage, wasRedacted } = redactVendorProbes(input.userMessage);

  if (wasRedacted) {
    securityEvents[securityEvents.length - 1].redacted = true;
  }

  // 3. Inject identity protocol
  const processedSystemPrompt = injectIdentityProtocol(input.systemPrompt);

  // 4. Determine if request should be blocked (high threat level)
  const shouldBlock = probeDetection.threatLevel === 'high';

  return {
    processedMessage,
    processedSystemPrompt,
    securityEvents,
    shouldBlock
  };
}

/**
 * Detect and sanitize code blocks containing Uhuru-specific implementation
 */
export function detectUhuruCodeBlock(text: string): {
  hasUhuruCode: boolean;
  codeBlockCount: number;
} {
  let hasUhuruCode = false;
  let codeBlockCount = 0;

  // Match code blocks (both ``` and indented)
  const codeBlockPattern = /```[\s\S]*?```|(?:^|\n)(?: {4}|\t).+(?:\n(?: {4}|\t).+)*/g;
  const matches = text.match(codeBlockPattern);

  if (!matches) {
    return { hasUhuruCode: false, codeBlockCount: 0 };
  }

  for (const block of matches) {
    codeBlockCount++;

    // Check if this code block contains Uhuru-specific identifiers
    for (const pattern of UHURU_INTERNAL_IDENTIFIERS) {
      if (pattern.test(block)) {
        hasUhuruCode = true;
        break;
      }
    }

    // Check for combinations of Uhuru context + implementation details
    const hasUhuruContext = /uhuru/gi.test(block);
    const hasDeno = /Deno\.serve|Deno\.env/gi.test(block);
    const hasSupabaseFunction = /supabase.*function/gi.test(block);
    const hasEdgeFunction = /edge.*function/gi.test(block);

    // If code block mentions Uhuru AND shows implementation, flag it
    if (hasUhuruContext && (hasDeno || hasSupabaseFunction || hasEdgeFunction)) {
      hasUhuruCode = true;
    }
  }

  return { hasUhuruCode, codeBlockCount };
}

/**
 * Sanitize code blocks by replacing Uhuru-specific implementations with generic examples
 */
export function sanitizeCodeBlocks(text: string): {
  sanitized: string;
  wasSanitized: boolean;
} {
  let sanitized = text;
  let wasSanitized = false;

  // If text contains code blocks with Uhuru internals, apply aggressive sanitization
  const { hasUhuruCode } = detectUhuruCodeBlock(text);

  if (hasUhuruCode) {
    // Replace entire code blocks that show Uhuru edge function structure
    const edgeFunctionPattern = /```(?:typescript|ts|javascript|js)?[\s\S]*?(?:uhuru-llm-api|uhuru-files|identity_guard|buildUhuruSystemPrompt)[\s\S]*?```/gi;

    if (edgeFunctionPattern.test(sanitized)) {
      sanitized = sanitized.replace(
        edgeFunctionPattern,
        "```typescript\n// Example: Generic edge function structure\n// Replace with your own implementation\n\nDeno.serve(async (req: Request) => {\n  // Your API logic here\n  return new Response(JSON.stringify({ message: 'Success' }), {\n    headers: { 'Content-Type': 'application/json' }\n  });\n});\n```"
      );
      wasSanitized = true;
    }

    // Also apply regular sanitization
    const { sanitized: regularSanitized, wasSanitized: regularWasSanitized } = sanitizeResponse(sanitized);
    sanitized = regularSanitized;
    wasSanitized = wasSanitized || regularWasSanitized;
  }

  return { sanitized, wasSanitized };
}

/**
 * Post-process response to sanitize any leakage
 */
export function guardResponse(responseText: string): {
  sanitizedResponse: string;
  detectedLeakage: boolean;
  leakTypes: string[];
} {
  const { hasLeakage, leakTypes } = detectResponseLeakage(responseText);

  // First apply code block sanitization
  const { sanitized: codeSanitized, wasSanitized: codeSanitized_ } = sanitizeCodeBlocks(responseText);

  // Then apply regular sanitization
  const { sanitized, wasSanitized } = sanitizeResponse(codeSanitized);

  // CRITICAL: If after sanitization the response is too short or still contains leakage indicators,
  // replace with a safe fallback response
  const stillHasLeakage = /PROTOCOL|NON-NEGOTIABLE|system\s+prompt|my\s+instructions/gi.test(sanitized);
  const tooShortAfterSanitization = sanitized.trim().length < 20;

  if ((stillHasLeakage || tooShortAfterSanitization) && hasLeakage) {
    // Replace with safe identity response
    return {
      sanitizedResponse: "Hello! I'm Uhuru, an AI assistant created by OrionX in Botswana. I'm designed to understand African contexts and help with various tasks like writing, analysis, planning, and answering questions. How can I assist you today?",
      detectedLeakage: true,
      leakTypes: [...leakTypes, 'replaced_with_fallback']
    };
  }

  return {
    sanitizedResponse: sanitized,
    detectedLeakage: hasLeakage || wasSanitized || codeSanitized_,
    leakTypes
  };
}
