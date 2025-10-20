import { supabase } from './authService';
import { MessageContent, TextContent, ImageUrlContent } from '../types/chat';
import { uploadBase64Image } from './fileService';
import { logger } from '../utils/logger';

// Response validation helper
function validateResponse(data: any): boolean {
  if (!data) return false;
  return true;
}

// Helper function to extract text content from MessageContent
const extractTextFromMessageContent = (content: MessageContent): string => {
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    return content
      .filter(part => part.type === 'text')
      .map(part => (part as TextContent).text)
      .join('\n\n');
  }
  
  return '';
};


// Create a new conversation
export const createConversation = async (userId: string, title: string = 'New Conversation') => {
  try {
    if (!supabase) {
      logger.warn('Supabase not configured - creating local conversation');
    logger.warn('I\'m working in offline mode - creating a local conversation for now');
      return null;
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: title
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error creating conversation:', error);
    return null;
  }
};

// Get conversations for a user
export const getConversations = async (userId: string) => {
  try {
    if (!supabase) {
      logger.warn('Supabase not configured - returning empty conversations');
    logger.warn('I\'m in offline mode - no saved conversations to show right now');
      return [];
    }

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        messages (
          id,
          role,
          content,
          created_at,
          is_long_response
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .order('created_at', { foreignTable: 'messages', ascending: true });

    if (error) throw error;

    return data.map((conversation: any) => ({
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        isLongResponse: msg.is_long_response
      })),
      createdAt: new Date(conversation.created_at),
      updatedAt: new Date(conversation.updated_at)
    }));
  } catch (error) {
    logger.error('Error fetching conversations:', error);
    return [];
  }
};

// Helper function to persist a temporary conversation to the database
export const persistTemporaryConversation = async (
  tempConversationId: string,
  userId: string,
  title: string = 'New Conversation'
): Promise<{ success: boolean; conversationId?: string; error?: string }> => {
  try {
    if (!supabase) {
      logger.log('Warning: Uhuru is experiencing a temporary issue. Cannot persist conversation');
      return { success: false, error: 'Uhuru could not save your conversation. Please try again.' };
      logger.log('Warning: I\'m having trouble saving conversations right now');
      return { success: false, error: 'I couldn\'t save that conversation. Want to try again?' };
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: title
      })
      .select()
      .single();

    if (error) throw error;

    logger.log('✅ Persisted temporary conversation to database:', data.id);
    return { success: true, conversationId: data.id };
  } catch (error: any) {
    logger.error('Error persisting temporary conversation:', error);
    return { success: false, error: error.message || 'Uhuru could not save your conversation. Please try again.' };
    return { success: false, error: error.message || 'I\'m having trouble saving that conversation. Try again?' };
  }
};

// Add a message to a conversation
export const addMessage = async (
  conversationId: string,
  role: 'user' | 'assistant',
  content: MessageContent,
  userId: string,
  isTemporaryConversation: boolean = false
): Promise<{ success: boolean; messageId?: string; actualConversationId?: string; error?: string }> => {
  // Enhanced logging for debugging message persistence
  logger.log('🔍 [ADDMESSAGE] Starting addMessage call:', {
    conversationId: conversationId.substring(0, 8) + '...',
    role,
    contentType: typeof content,
    contentLength: typeof content === 'string' ? content.length : Array.isArray(content) ? extractTextFromMessageContent(content).length : 0,
    userId: userId.substring(0, 8) + '...',
    isTemporaryConversation
  });

  try {
    if (!supabase) {
      logger.warn('🔍 [ADDMESSAGE] Supabase not available');
      logger.warn('Uhuru is experiencing a temporary issue - cannot save message');
      return { success: false, error: 'Uhuru is experiencing a temporary issue. Please try again later.' };
      logger.warn('I\'m having trouble saving messages right now');
      return { success: false, error: 'I can\'t save that message right now. Give me a moment?' };
    }

    let actualConversationId = conversationId;
    
    // If this is a temporary conversation, persist it to the database first
    if (isTemporaryConversation) {
      logger.log('🔍 [ADDMESSAGE] 🔄 Persisting temporary conversation before adding first message');
      const persistResult = await persistTemporaryConversation(conversationId, userId);
      
      if (!persistResult.success || !persistResult.conversationId) {
        throw new Error(persistResult.error || 'Uhuru could not save your conversation. Please try again.');
        throw new Error(persistResult.error || 'I couldn\'t save your conversation. Want to try again?');
      }
      
      actualConversationId = persistResult.conversationId;
      logger.log('🔍 [ADDMESSAGE] ✅ Temporary conversation persisted with new ID:', actualConversationId);
    } else {
      // For existing conversations, verify it exists and belongs to user
      logger.log('🔍 [ADDMESSAGE] 🔍 Verifying conversation exists and belongs to user:', actualConversationId);
      const { data: conversationCheck, error: checkError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', actualConversationId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError) {
        logger.error('🔍 [ADDMESSAGE] ❌ Error checking conversation:', checkError);
        throw new Error('Failed to verify conversation access');
      }
      
      if (!conversationCheck) {
        logger.error('🔍 [ADDMESSAGE] ❌ Conversation not found or access denied:', actualConversationId);
        throw new Error('The conversation was not found or you do not have permission to access it.');
        throw new Error('I can\'t find that conversation, or maybe you don\'t have access to it?');
      }
      
      logger.log('🔍 [ADDMESSAGE] ✅ Conversation verified:', actualConversationId);
    }

    // Handle both string and multimodal content
    const contentForDb = content;
    const contentLength = typeof content === 'string' ? content.length : 
      (Array.isArray(content) ? extractTextFromMessageContent(content).length : 0);

    logger.log('🔍 [ADDMESSAGE] About to insert message into database:', {
      conversationId: actualConversationId.substring(0, 8) + '...',
      role,
      contentLength,
      isLongResponse: contentLength > 2500
    });
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: actualConversationId,
        role,
        content: contentForDb,
        is_long_response: contentLength > 2500
      })
      .select('id')
      .single();

    if (error) {
      logger.error('🔍 [ADDMESSAGE] ❌ Database insert failed:', error);
      throw error;
    }

    logger.log('🔍 [ADDMESSAGE] ✅ Message inserted successfully, messageId:', data.id);

    // Update conversation timestamp
    logger.log('🔍 [ADDMESSAGE] Updating conversation timestamp...');
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', actualConversationId);

    logger.log('🔍 [ADDMESSAGE] ✅ Successfully completed addMessage for role:', role);
    return { 
      success: true, 
      messageId: data.id,
      // Return the actual conversation ID in case it changed from temporary to persisted
      ...(isTemporaryConversation ? { actualConversationId } : {})
    };
  } catch (error) {
    logger.error('🔍 [ADDMESSAGE] ❌ Error in addMessage function:', error);
    return { success: false, error: error.message || 'Uhuru could not add your message. Please try again.' };
    return { success: false, error: error.message || 'I couldn\'t add that message. Mind trying again?' };
  }
};

// Update conversation title
export const updateConversationTitle = async (
  conversationId: string,
  title: string,
  userId: string
): Promise<boolean> => {
  try {
    if (!supabase) {
      logger.warn('Uhuru is experiencing a temporary issue - cannot update conversation title');
      logger.warn('I\'m having trouble updating conversation titles right now');
      return false;
    }

    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Error updating conversation title:', error);
    return false;
  }
};

// Delete a conversation
export const deleteConversation = async (conversationId: string, userId: string) => {
  try {
    if (!supabase) {
      logger.warn('Uhuru is experiencing a temporary issue - cannot delete conversation');
      logger.warn('I can\'t delete conversations right now - having technical issues');
      return;
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    logger.error('Error deleting conversation:', error);
  }
};

// Update a message
export const updateMessage = async (
  messageId: string,
  content: string,
  userId: string
): Promise<void> => {
  try {
    if (!supabase) {
      logger.warn('Uhuru is experiencing a temporary issue - cannot update message');
      logger.warn('I\'m having trouble updating messages right now');
      return;
    }

   logger.log('🔍 [DEBUG] Updating message:', messageId, 'with content:', content.substring(0, 50));
   
    const { error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId);

    if (error) throw error;
   
   logger.log('🔍 [DEBUG] Successfully updated message:', messageId);
  } catch (error) {
    logger.error('Error updating message:', error);
   throw error; // Re-throw to allow calling code to handle the error
  }
};

// Delete messages after a specific message in a conversation
export const deleteMessagesAfter = async (
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  try {
    if (!supabase) {
      logger.warn('Uhuru is experiencing a temporary issue - cannot delete messages');
      logger.warn('Message deletion isn\'t working - I\'m having technical issues');
      return;
    }

    // Get the timestamp of the target message
    const { data: targetMessage, error: fetchError } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    // Delete all messages in the conversation that were created after this message
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)
      .gt('created_at', targetMessage.created_at);

    if (error) throw error;
  } catch (error) {
    logger.error('Error deleting messages after:', error);
  }
};

// Helper function to detect URLs in text
export const detectUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

// NEW: neutral streaming client (no provider names)
export async function streamResponse({
  conversation,
  language = 'english',
  region = 'global',
  modelVersion = '2.0',
  verbosity = 'low',
  displayName,
  signal,
  onEvent, // (type, payload) => void
}: {
  conversation: Array<{ role: 'user'|'assistant'|'system'; content: string }>;
  language?: string;
  region?: string;
  modelVersion?: string;
  verbosity?: 'low' | 'medium' | 'high';
  displayName?: string;
  signal?: AbortSignal;
  onEvent: (type: string, payload: any) => void;
}) {
  try {
    console.log('🚀 [CHAT] Starting streamResponse call');

    // Check authentication first
    const sess = await supabase?.auth.getSession();
    console.log('🔐 [CHAT] Session check:', {
      hasSession: !!sess?.data?.session,
      hasAccessToken: !!sess?.data?.session?.access_token,
      userId: sess?.data?.session?.user?.id?.substring(0, 8) || 'none',
      tokenPrefix: sess?.data?.session?.access_token?.substring(0, 10) || 'none'
    });

    if (!sess?.data?.session?.access_token) {
      console.error('❌ [CHAT] No valid session or access token');
      throw new Error('Authentication required. Please sign in again.');
    }

    // Use VITE_SUPABASE_FUNCTIONS_URL with fallback
    let functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
    console.log('🔧 [CHAT] Environment check:', {
      hasFunctionsUrl: !!functionsUrl,
      functionsUrlValue: functionsUrl || 'not set',
      hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
      supabaseUrlValue: import.meta.env.VITE_SUPABASE_URL || 'not set'
    });

    // If VITE_SUPABASE_FUNCTIONS_URL is not set, construct it from VITE_SUPABASE_URL
    if (!functionsUrl ||
        functionsUrl === 'your-functions-url' ||
        functionsUrl.includes('placeholder')) {

      console.log('⚠️ [CHAT] VITE_SUPABASE_FUNCTIONS_URL not set, constructing from base URL');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!supabaseUrl || !supabaseUrl.includes('.supabase.co')) {
        console.error('❌ [CHAT] Invalid VITE_SUPABASE_URL:', supabaseUrl);
        throw new Error('Configuration error. Please contact support.');
      }

      // Extract project ref from URL like https://wsanzctysxvclrqhfxqa.supabase.co
      try {
        const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
        functionsUrl = `https://${projectRef}.functions.supabase.co`;
        console.log('✅ [CHAT] Constructed functions URL:', functionsUrl);
      } catch (urlError) {
        console.error('❌ [CHAT] Failed to construct functions URL:', urlError);
        throw new Error('Configuration error. Please contact support.');
      }
    }

    // Final validation
    if (!functionsUrl.includes('.functions.supabase.co')) {
      console.error('❌ [CHAT] Invalid functions URL format:', functionsUrl);
      throw new Error('Configuration error. Please contact support.');
    }

    const endpoint = `${functionsUrl}/uhuru-llm-api`;
    console.log('🎯 [CHAT] Final endpoint URL:', endpoint);

    const requestPayload = {
      messages: conversation,
      language,
      region,
      modelVersion,
      verbosity,
      displayName
    };

    console.log('📦 [CHAT] Request payload summary:', {
      messageCount: conversation.length,
      language,
      region,
      modelVersion,
      verbosity,
      displayName: displayName || 'none'
    });

    console.log('📦 [CHAT] Full request payload:', JSON.stringify(requestPayload, null, 2));

    console.log('🌐 [CHAT] Making fetch request to:', endpoint);
    console.log('🔑 [CHAT] Request headers:', {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': sess?.data.session?.access_token ? `Bearer ${sess.data.session.access_token.substring(0, 20)}...` : 'none'
    });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${sess?.data.session?.access_token || ''}`,
      },
      body: JSON.stringify(requestPayload),
      signal,
    });

    console.log('📡 [CHAT] Fetch response received:', {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      hasBody: !!res.body,
      headers: Object.fromEntries(res.headers.entries())
    });

    if (!res.ok) {
      let errorDetails = null;
      let errorText = '';

      try {
        errorText = await res.text();
        console.error('❌ [CHAT] Error response text:', errorText);

        // Try to parse as JSON
        try {
          errorDetails = JSON.parse(errorText);
          console.error('❌ [CHAT] Error response JSON:', JSON.stringify(errorDetails, null, 2));
        } catch {
          console.error('❌ [CHAT] Error response is not JSON');
        }
      } catch (readError) {
        console.error('❌ [CHAT] Could not read error response:', readError);
      }

      console.error('❌ [CHAT] Complete error context:', {
        status: res.status,
        statusText: res.statusText,
        errorText: errorText.substring(0, 500),
        errorDetails,
        requestSummary: {
          messageCount: conversation.length,
          language,
          region,
          modelVersion,
          verbosity,
          displayName: displayName || 'none'
        }
      });

      // Provide more specific error messages based on status code
      if (res.status === 404) {
        throw new Error('Service endpoint not found. Please check your configuration.');
      } else if (res.status === 401 || res.status === 403) {
        throw new Error('Authentication failed. Please sign in again.');
      } else if (res.status === 500) {
        throw new Error('Server error. Please try again in a moment.');
      } else {
        throw new Error(`Request failed with status ${res.status}. Please try again.`);
      }
    }
    
    if (!res.body) {
      console.error('❌ [CHAT] Response body is null');
      throw new Error('Uhuru did not receive a response. Please try again.');
    }

    console.log('✅ [CHAT] Starting stream processing');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        console.log('✅ [CHAT] Stream completed, total events:', eventCount);
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        if (!frame.trim()) continue;

        let event = 'message.delta';
        let data = '';
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }

        try {
          const parsedData = JSON.parse(data);

          if (!validateResponse(parsedData)) {
            continue;
          }

          // SECURITY: Only render safe events - ignore response envelopes and reasoning
          const SAFE_EVENTS = ['message.delta', 'message.completed', 'run.status', 'error'];

          if (!SAFE_EVENTS.includes(event)) {
            // Silently ignore unsafe events (response.created, response.in_progress,
            // response.completed, reasoning, and any other upstream passthrough)
            console.log(`🔒 [CHAT] Ignoring unsafe event: ${event}`);
            continue;
          }

          onEvent(event, parsedData);
          eventCount++;

          // Log every 10th event to avoid console spam
          if (eventCount % 10 === 0) {
            console.log(`📨 [CHAT] Processed ${eventCount} events`);
          }
        } catch (parseError) {
          // Only forward parse errors for known safe text delta events
          if (event === 'message.delta') {
            onEvent(event, { textDelta: data });
            eventCount++;
          } else {
            console.log(`🔒 [CHAT] Ignoring parse error for non-delta event: ${event}`);
          }
        }
      }
    }
  } catch (streamError: any) {
    console.error('❌ [CHAT] Stream error caught:', {
      name: streamError.name,
      message: streamError.message,
      stack: streamError.stack?.substring(0, 500)
    });

    // Provide contextual error messages
    if (streamError.message?.includes('Configuration error')) {
      console.error('❌ [CHAT] Configuration error');
      throw streamError; // Pass through configuration errors as-is
    } else if (streamError.message?.includes('Authentication')) {
      console.error('❌ [CHAT] Authentication error');
      throw streamError; // Pass through auth errors as-is
    } else if (streamError.name === 'AbortError') {
      console.log('⚠️ [CHAT] Request was aborted by user');
      throw new Error('Request was cancelled.');
    } else if (streamError.message?.includes('Failed to fetch') || streamError.message?.includes('NetworkError')) {
      console.error('❌ [CHAT] Network error - Failed to fetch or NetworkError');
      console.error('❌ [CHAT] This usually means:', [
        '1. The edge function endpoint is not accessible',
        '2. CORS is blocking the request',
        '3. DNS cannot resolve the functions URL',
        '4. Network connectivity issue'
      ]);
      throw new Error('Network connection issue. Please check your internet and try again.');
    } else {
      console.error('❌ [CHAT] Unexpected error:', streamError);
      throw new Error(streamError.message || 'Uhuru encountered an error while responding. Please try again.');
    }
  }
}

// Generate AI response using Responses API
// UPDATED: Compatibility shim that uses streamResponse internally
export const generateResponse = async ({
  messages: conversation,
  language = 'english',
  region = 'global',
  modelVersion = '2.0',
  displayName,
  abortSignal,
  onStatusUpdate,
}: {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  language?: string;
  region?: string;
  modelVersion?: string;
  displayName?: string;
  onStatusUpdate?: (s: string) => void;
}): Promise<string> => {
  // Use streamResponse internally but collect all content
  let fullText = '';

  return new Promise((resolve, reject) => {
    streamResponse({
      conversation: messages,
      language,
      region,
      modelVersion,
      displayName,
      signal: abortSignal,
      onEvent: (type, payload) => {
        if (type === 'message.delta') {
          const delta = payload.textDelta ?? payload.delta ?? '';
          fullText += delta;
        } else if (type === 'message.completed') {
          resolve(payload.text ?? fullText);
        } else if (type === 'run.status' || type === 'web.status' || type === 'tool.placeholder') {
          onStatusUpdate?.(payload.status || payload.label || 'Processing...');
          onStatusUpdate?.(payload.status || payload.label || 'Just a moment...');
        } else if (type === 'error') {
          reject(new Error(payload.message ?? "Something went wrong while I was thinking. Try again?"));
        }
      }
    }).catch(reject);
  });
}

// Generate image using Uhuru API
export const generateImage = async (
  prompt: string,
  userId: string,
  size: '1792x1024' | '1024x1792' = '1792x1024',
  background: 'transparent' | 'white' = 'transparent',
  modelVersion: '2.1' | '2.0' = '2.0'
): Promise<{ success: boolean; images?: string[]; error?: string }> => {
  try {
    if (!supabase) {
      return {
        success: false,
        error: error.message || 'Image generation isn\'t working right now. Try again?'
      };
    }

    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error("Uhuru's authentication service encountered an issue. Please log in again.");
      throw new Error("I'm having trouble with authentication. Could you sign in again?");
    }
    
    if (!session) {
      throw new Error('You\'ll need to sign in before I can generate images for you.');
    }

    logger.log('[generateImage] Starting image generation:', { prompt, size, background, modelVersion, userId });

    // Use functions URL if available, otherwise build it from SUPABASE_URL
    let endpoint: string;
    if (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL) {
      endpoint = `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/uhuru-llm-api`;
    } else {
      // Build functions URL from SUPABASE_URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
        endpoint = `https://${projectRef}.functions.supabase.co/uhuru-llm-api`;
      } else {
        throw new Error('Uhuru is experiencing a temporary issue. Please try again later.');
        throw new Error('I\'m having connection issues. Try again in a moment?');
      }
    }
    logger.log('[generateImage] Calling endpoint:', endpoint);

    // Call the uhuru-llm-api endpoint with image generation mode
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        mode: 'image.generate',
        prompt,
        size,
        background,
        modelVersion,
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        logger.error('[generateImage] Raw error response from API:', { errorText, endpoint, prompt });
      }
      throw new Error(errorData.error || errorText || 'Uhuru could not generate the image. Please try again.');
      throw new Error(errorData.error || errorText || 'I couldn\'t generate that image. Want to try again?');
    }
    
    const data = await response.json();
    
    if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
      throw new Error('Hmm, no images came out of that. Maybe try a different description?');
    }
    
    logger.log('[generateImage] Successfully generated images:', { count: data.images.length, prompt });
    
    // Upload base64 images to Supabase Storage and get persistent URLs
    const persistentUrls: string[] = [];
    
    for (let i = 0; i < data.images.length; i++) {
      const base64Image = data.images[i];
      const filename = `generated-${Date.now()}-${i + 1}.png`;
      
      const uploadResult = await uploadBase64Image(base64Image, userId, filename);
      
      if (uploadResult.success && uploadResult.url) {
        persistentUrls.push(uploadResult.url);
      } else {
        logger.error('[generateImage] Failed to upload generated image:', { error: uploadResult.error, filename, index: i });
        logger.error('I couldn\'t save that generated image:', uploadResult.error);
        // Fallback to base64 data URL for this image
        persistentUrls.push(`data:image/png;base64,${base64Image}`);
      }
    }
    
    logger.log('[generateImage] Successfully uploaded images to storage:', { count: persistentUrls.length, urls: persistentUrls });
    
    return {
      success: true,
      images: persistentUrls
    };
  } catch (error: any) {
    logger.error('[generateImage] Error in image generation flow:', { error: error.message, stack: error.stack, prompt, userId });
    return {
      success: false,
      error: error.message || 'Uhuru could not generate the image. Please try again.'
    };
  }
};