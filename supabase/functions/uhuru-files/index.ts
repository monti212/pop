import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Max-Age': '600',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const UHURU_AI_KEY = Deno.env.get('UHURU_AI_KEY') ?? Deno.env.get('PROVIDER_API_KEY') ?? '';
const UHURU_FILES_URL = Deno.env.get('UHURU_FILES_URL') ?? Deno.env.get('PROVIDER_FILES_URL') ?? '';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('=== UHURU-FILES STARTING ===');
console.log('Environment check:', {
  supabaseUrl: !!SUPABASE_URL,
  serviceKey: !!SERVICE_KEY,
  uhuruAiKey: !!UHURU_AI_KEY,
  uhuruFilesUrl: UHURU_FILES_URL,
});

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

function randHandle() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return 'uhf_' + Array.from(bytes, b => chars[b % 62]).join('');
}

Deno.serve(async (req) => {
  console.log(`=== UHURU-FILES REQUEST: ${req.method} ===`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  
  if (req.method !== 'POST') {
    return j({ error: 'Method not allowed' }, 405);
  }
  
  if (!UHURU_AI_KEY) {
    console.error('❌ Uhuru AI service key not configured');
    return j({ error: 'Uhuru AI service not configured' }, 500);
  }

  try {
    // Optional: authenticate user
    let userId: string | null = null;
    const auth = req.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice('Bearer '.length).trim();
      try {
        const { data } = await supabase.auth.getUser(token);
        if (data?.user) {
          userId = data.user.id;
          console.log('✅ User authenticated:', data.user.email);
        }
      } catch (authError) {
        console.warn('⚠️ Auth error, proceeding as anonymous:', authError);
      }
    }

    const contentType = req.headers.get('content-type') || '';
    let fileBlob: Blob | null = null;
    let filename = 'upload.bin';

    // Handle multipart/form-data uploads
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart form data upload');
      const form = await req.formData();
      const fileField = form.get('file');
      
      if (fileField instanceof File) {
        fileBlob = fileField;
        filename = fileField.name || filename;
        console.log(`📎 File received: ${filename} (${fileBlob.size} bytes)`);
      }
    } else {
      // Handle JSON uploads with base64 content
      console.log('Processing JSON/base64 upload');
      const body = await req.json().catch(() => ({}));
      
      if (body.base64) {
        try {
          const binaryString = atob(body.base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          fileBlob = new Blob([bytes]);
          filename = body.filename || filename;
          console.log(`📎 Base64 file received: ${filename} (${fileBlob.size} bytes)`);
        } catch (decodeError) {
          console.error('❌ Base64 decode error:', decodeError);
          return j({ error: 'Invalid base64 content' }, 400);
        }
      }
    }

    if (!fileBlob) {
      console.error('❌ No file provided in request');
      return j({ error: 'No file provided' }, 400);
    }

    // Build form-data for provider Files API
    console.log(`📤 Uploading to Uhuru AI: ${filename}`);
    const uhuruForm = new FormData();
    uhuruForm.append('file', new File([fileBlob], filename, { type: fileBlob.type }));
    uhuruForm.append('purpose', 'assistants'); // Generic purpose for file_search/code tools

    // Forward to Uhuru AI Files API
    const upstreamResponse = await fetch(UHURU_FILES_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UHURU_AI_KEY}`,
      },
      body: uhuruForm
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => '');
      console.error(`❌ Uhuru AI upload failed: ${upstreamResponse.status} ${upstreamResponse.statusText}`, errorText);
      
      // Mask AI service error details
      const genericError = upstreamResponse.status === 413 ? 'File too large' :
                          upstreamResponse.status === 415 ? 'Unsupported file type' :
                          upstreamResponse.status === 429 ? 'Upload rate limit exceeded' :
                          'Upload failed';
      
      return j({ error: genericError }, upstreamResponse.status);
    }

    const uhuruData = await upstreamResponse.json();
    const uhuruFileId = uhuruData?.id;
    
    if (!uhuruFileId) {
      console.error('❌ Uhuru AI response missing file ID');
      return j({ error: 'Upload missing id' }, 502);
    }

    console.log(`✅ Uhuru AI file created: ${uhuruFileId}`);

    // Generate opaque handle and store mapping
    const handle = randHandle();
    console.log(`💾 Storing mapping: ${handle} → ${uhuruFileId}`);
    
    const { error: insertError } = await supabase
      .from('provider_files')
      .insert({
        handle,
        file_id: uhuruFileId,
        user_id: userId,
        filename: filename,
        file_size: fileBlob.size,
        file_type: fileBlob.type || 'application/octet-stream'
      });

    if (insertError) {
      console.error('❌ Error storing file mapping:', insertError);
      // Continue anyway - the file was uploaded successfully to Uhuru AI
    }

    console.log(`✅ File upload complete: ${handle}`);

    // Return only the opaque handle to the client
    return j({
      handle,
      filename,
      size: fileBlob.size,
      type: fileBlob.type || 'application/octet-stream'
    }, 200);

  } catch (error: any) {
    console.error('❌ Uhuru file upload error:', error);
    return j({ 
      error: 'File upload failed',
      details: error.message 
    }, 500);
  }
});