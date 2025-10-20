import { supabase } from './authService';

interface ChunkResult {
  content: string;
  tokenCount: number;
  metadata: any;
}

export class KnowledgeBaseService {
  private static readonly CHUNK_SIZE = 800;
  private static readonly CHUNK_OVERLAP = 100;
  private static readonly MAX_CHUNK_SIZE = 1000;

  static async processDocument(documentId: string): Promise<void> {
    try {
      const { data: doc, error: docError } = await supabase
        .from('knowledge_base_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !doc) {
        throw new Error('Document not found');
      }

      await this.updateDocumentStatus(documentId, 'processing');

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('user-files')
        .download(doc.storage_path);

      if (downloadError || !fileData) {
        throw new Error('Failed to download document');
      }

      let textContent = '';

      if (doc.file_type === 'application/pdf') {
        textContent = await this.extractTextFromPDF(fileData);
      } else if (doc.file_type.includes('word') || doc.file_name.endsWith('.docx')) {
        textContent = await this.extractTextFromWord(fileData);
      } else if (doc.file_type === 'text/plain' || doc.file_type === 'text/markdown') {
        textContent = await fileData.text();
      } else {
        throw new Error('Unsupported file type');
      }

      const chunks = this.chunkText(textContent, doc.file_name);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const { data: chunkData, error: chunkError } = await supabase
          .from('knowledge_base_chunks')
          .insert({
            document_id: documentId,
            chunk_index: i,
            content: chunk.content,
            token_count: chunk.tokenCount,
            metadata: chunk.metadata,
          })
          .select()
          .single();

        if (chunkError || !chunkData) {
          console.error('Failed to insert chunk:', chunkError);
          continue;
        }

        try {
          const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-kb-embedding`;
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              chunk_id: chunkData.id,
              document_id: documentId,
              content: chunk.content,
            }),
          });

          if (!response.ok) {
            console.error('Failed to generate embedding for chunk:', chunkData.id);
          }
        } catch (embeddingError) {
          console.error('Error calling embedding function:', embeddingError);
        }
      }

      await supabase
        .from('knowledge_base_documents')
        .update({
          status: 'completed',
          chunk_count: chunks.length,
          embedding_count: chunks.length,
          processed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

    } catch (error) {
      console.error('Error processing document:', error);
      await this.updateDocumentStatus(documentId, 'failed');
      throw error;
    }
  }

  private static async updateDocumentStatus(
    documentId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    await supabase
      .from('knowledge_base_documents')
      .update({ status })
      .eq('id', documentId);
  }

  private static async extractTextFromPDF(file: Blob): Promise<string> {
    try {
      // Lazy load pdfjs only when needed
      const pdfjs = await import('pdfjs-dist');

      // Configure worker
      if (typeof window !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      const pdf = await loadingTask.promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      return fullText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF. The file may be corrupted or unsupported.');
    }
  }

  private static async extractTextFromWord(file: Blob): Promise<string> {
    try {
      // Lazy load mammoth only when needed
      const mammoth = await import('mammoth');

      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.default.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting text from Word document:', error);
      throw new Error('Failed to extract text from Word document. The file may be corrupted or unsupported.');
    }
  }

  private static chunkText(text: string, fileName: string): ChunkResult[] {
    const chunks: ChunkResult[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    let currentChunk = '';
    let currentTokenCount = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      const sentenceTokenCount = this.estimateTokenCount(trimmedSentence);

      if (currentTokenCount + sentenceTokenCount > this.CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          tokenCount: currentTokenCount,
          metadata: {
            source: fileName,
            chunk_type: 'text',
          },
        });

        const overlapText = this.getOverlapText(currentChunk, this.CHUNK_OVERLAP);
        currentChunk = overlapText + ' ' + trimmedSentence;
        currentTokenCount = this.estimateTokenCount(currentChunk);
      } else {
        currentChunk += (currentChunk.length > 0 ? '. ' : '') + trimmedSentence;
        currentTokenCount += sentenceTokenCount;
      }

      if (currentTokenCount >= this.MAX_CHUNK_SIZE) {
        chunks.push({
          content: currentChunk.trim(),
          tokenCount: currentTokenCount,
          metadata: {
            source: fileName,
            chunk_type: 'text',
          },
        });
        currentChunk = '';
        currentTokenCount = 0;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokenCount,
        metadata: {
          source: fileName,
          chunk_type: 'text',
        },
      });
    }

    return chunks;
  }

  private static getOverlapText(text: string, targetTokenCount: number): string {
    const words = text.split(/\s+/);
    const overlapWords = words.slice(-Math.ceil(targetTokenCount / 0.75));
    return overlapWords.join(' ');
  }

  private static estimateTokenCount(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  static async searchKnowledgeBase(
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<any[]> {
    try {
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-knowledge-base`;
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query,
          limit,
          threshold,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search knowledge base');
      }

      const results = await response.json();
      return results;
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }

  static async logRetrieval(
    userId: string,
    query: string,
    results: any[],
    usedInResponse: boolean
  ): Promise<void> {
    try {
      await supabase.from('knowledge_base_retrievals').insert({
        user_id: userId,
        query,
        chunks_retrieved: results.length,
        document_ids: results.map(r => r.document_id),
        relevance_scores: results.map(r => r.similarity),
        used_in_response: usedInResponse,
      });
    } catch (error) {
      console.error('Error logging retrieval:', error);
    }
  }
}
