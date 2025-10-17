import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Summarization prompt for knowledge documents
function buildSummarizationPrompt(documentType: string, title: string, content: string) {
  return `You are analyzing a critical teaching document for the Uhuru AI teaching assistant system.

**Document Information:**
- Title: ${title}
- Type: ${documentType}
- Purpose: This document will become part of Uhuru's core knowledge base

**Your Task:**
Analyze this document thoroughly and extract the most important information that a teaching AI assistant needs to know. Focus on:

1. **Core Concepts & Principles**: What are the fundamental ideas, methodologies, or guidelines?
2. **Practical Applications**: How should teachers apply this information in real classrooms?
3. **Key Rules & Standards**: What are the non-negotiable rules, standards, or requirements?
4. **Context-Specific Details**: Grade levels, subjects, regional considerations (especially Ghana context)
5. **Examples & Scenarios**: Concrete examples that illustrate proper application

**Document Content:**
${content.substring(0, 50000)}

**Output Format:**
Provide a comprehensive but concise summary in the following structure:

# OVERVIEW
[2-3 paragraph overview of the document's purpose and scope]

# KEY PRINCIPLES
- [Principle 1]
- [Principle 2]
- [Continue...]

# PRACTICAL GUIDELINES
- [Guideline 1 with brief explanation]
- [Guideline 2 with brief explanation]
- [Continue...]

# GRADE-SPECIFIC INFORMATION
[Any grade-level or subject-specific details]

# IMPORTANT CONTEXT
[Cultural, regional, or system-specific context that teachers need to know]

# EXAMPLES & APPLICATIONS
[Concrete examples of how to apply this knowledge]

**Requirements:**
- Be comprehensive but concise
- Focus on actionable information
- Maintain accuracy - do not infer beyond what the document states
- Use clear, teacher-friendly language
- Highlight anything specific to Ghana's educational context
- Extract information that directly helps teachers plan and deliver lessons`;
}

function extractKeyConceptsPrompt(summary: string) {
  return `Based on this document summary, extract the TOP 10 most important concepts, rules, or guidelines as a JSON array.

Summary:
${summary}

Provide output as a JSON array of objects with this structure:
[
  {
    "concept": "Brief concept name",
    "description": "One sentence explanation",
    "importance": "high" | "medium" | "low",
    "applicability": "Grade levels or subjects this applies to"
  }
]

Only return valid JSON, no additional text.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const uhuruApiUrl = Deno.env.get('UHURU_API_URL')!;
    const uhuruApiKey = Deno.env.get('UHURU_API_KEY')!;
    const uhuruModel = Deno.env.get('UHURU_MODEL_20')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is optimus_prime
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('team_role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.team_role !== 'optimus_prime') {
      return new Response(JSON.stringify({ error: 'Unauthorized: optimus_prime role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'documentId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📄 Processing document: ${documentId}`);

    // Get document from database
    const { data: document, error: docError } = await supabase
      .from('admin_knowledge_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status to processing
    await supabase
      .from('admin_knowledge_documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    // Log the action
    await supabase.rpc('log_knowledge_action', {
      p_action: 'process',
      p_document_id: documentId,
      p_details: { document_title: document.title, document_type: document.document_type }
    });

    console.log(`🤖 Calling Uhuru AI for summarization...`);

    // Call Uhuru AI for summarization
    const summarizationPrompt = buildSummarizationPrompt(
      document.document_type,
      document.title,
      document.original_content
    );

    const summaryResponse = await fetch(uhuruApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${uhuruApiKey}`,
      },
      body: JSON.stringify({
        model: uhuruModel,
        input: [
          {
            type: 'message',
            role: 'user',
            content: [
              { type: 'input_text', text: summarizationPrompt }
            ]
          }
        ],
        instructions: 'You are a precise document analyzer. Extract and summarize critical information for an AI teaching assistant.',
        stream: false
      }),
    });

    if (!summaryResponse.ok) {
      throw new Error(`Uhuru API error: ${summaryResponse.status}`);
    }

    const summaryData = await summaryResponse.json();
    let aiSummary = '';

    // Extract text from response
    if (summaryData.response?.output_text) {
      aiSummary = summaryData.response.output_text;
    } else if (summaryData.message?.content) {
      const textParts = summaryData.message.content.filter((p: any) => p.type === 'output_text');
      aiSummary = textParts.map((p: any) => p.text).join('\n');
    }

    console.log(`✅ Summary generated (${aiSummary.length} characters)`);

    // Extract key concepts
    console.log(`🔍 Extracting key concepts...`);

    const conceptsResponse = await fetch(uhuruApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${uhuruApiKey}`,
      },
      body: JSON.stringify({
        model: uhuruModel,
        input: [
          {
            type: 'message',
            role: 'user',
            content: [
              { type: 'input_text', text: extractKeyConceptsPrompt(aiSummary) }
            ]
          }
        ],
        instructions: 'Extract key concepts as valid JSON only. No additional text.',
        stream: false
      }),
    });

    let keyConcepts = [];
    if (conceptsResponse.ok) {
      const conceptsData = await conceptsResponse.json();
      let conceptsText = '';
      
      if (conceptsData.response?.output_text) {
        conceptsText = conceptsData.response.output_text;
      } else if (conceptsData.message?.content) {
        const textParts = conceptsData.message.content.filter((p: any) => p.type === 'output_text');
        conceptsText = textParts.map((p: any) => p.text).join('\n');
      }

      try {
        // Try to extract JSON from the response
        const jsonMatch = conceptsText.match(/\[.*\]/s);
        if (jsonMatch) {
          keyConcepts = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.warn('Failed to parse key concepts JSON, using empty array');
      }
    }

    console.log(`✅ Extracted ${keyConcepts.length} key concepts`);

    // Update document with summary and key concepts
    const { error: updateError } = await supabase
      .from('admin_knowledge_documents')
      .update({
        ai_summary: aiSummary,
        key_concepts: keyConcepts,
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
        is_active: true
      })
      .eq('id', documentId);

    if (updateError) {
      throw updateError;
    }

    // Create structured summaries for efficient retrieval
    const summaryTypes = [
      { type: 'overview', priority: 10 },
      { type: 'key_points', priority: 9 },
      { type: 'guidelines', priority: 8 },
      { type: 'examples', priority: 7 },
      { type: 'context', priority: 6 }
    ];

    for (const { type, priority } of summaryTypes) {
      const sectionMatch = aiSummary.match(new RegExp(`# ${type.toUpperCase().replace('_', ' ')}\\s*([\\s\\S]*?)(?=\\n# |$)`, 'i'));
      if (sectionMatch && sectionMatch[1]) {
        const content = sectionMatch[1].trim();
        if (content.length > 0) {
          await supabase.from('knowledge_base_summaries').insert({
            document_id: documentId,
            summary_type: type,
            content,
            tokens: Math.ceil(content.length / 4),
            priority
          });
        }
      }
    }

    console.log(`🎉 Document processing complete: ${documentId}`);

    return new Response(JSON.stringify({
      success: true,
      documentId,
      summary: aiSummary,
      keyConcepts,
      message: 'Document processed and activated successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error processing document:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to process document',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});