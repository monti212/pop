/**
 * SSE normalisation + usage metering shared by the Uhuru serving functions.
 *
 * Deliberately free of Deno globals and `npm:` specifiers so the Node test runner
 * can import it. Anything runtime-specific is either feature-detected
 * (settleInBackground) or injected by the caller (the `sanitize` option).
 *
 * The invariant this module exists to protect:
 *
 *   A usage write MUST be settled — or handed to EdgeRuntime.waitUntil — BEFORE the
 *   response stream closes.
 *
 * Supabase's edge runtime drops a worker once the response completes and no work is
 * pending (`EarlyDrop` / `EventLoopCompleted`). A ledger write started after
 * controller.close() therefore races isolate teardown: the reply streams perfectly
 * and the usage row silently never lands. That is exactly how the token meter froze
 * when U4 became the default chat path.
 */

export type UsageCompletion = { text: string; tokensUsed: number };

/** Callback may return a promise; if it does, the caller must settle it before close. */
export type OnComplete = (usage: UsageCompletion) => unknown;

export interface NormalizeStreamOptions {
  onComplete?: OnComplete | null;
  fallbackInputTokens?: number;
  /** Applied to the final message text. Injected so this module stays runtime-free. */
  sanitize?: (text: string) => string;
}

export function estimateTokensFromText(text: unknown): number {
  if (!text || typeof text !== 'string') return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function getUsageTotalTokens(
  payload: any,
  fallbackInputTokens: number,
  outputText: string,
): number {
  const usage = payload?.response?.usage ?? payload?.usage;
  const total = usage?.total_tokens ?? usage?.total_tokens_used;
  if (typeof total === 'number' && Number.isFinite(total) && total > 0) {
    return Math.ceil(total);
  }

  const inputTokens = usage?.input_tokens ?? usage?.prompt_tokens ?? fallbackInputTokens;
  const outputTokens = usage?.output_tokens ?? usage?.completion_tokens ?? estimateTokensFromText(outputText);
  return Math.max(1, Math.ceil((inputTokens || 0) + (outputTokens || 0)));
}

/**
 * Keep a background write alive across the end of the response.
 *
 * Where EdgeRuntime.waitUntil exists, hand the promise to the runtime and return
 * immediately — the isolate is held open for it and the caller does not wait.
 * Where it does not (local dev, tests, any other runtime), block on the promise
 * instead: slow-but-correct beats fast-and-lossy.
 *
 * Never rejects. A failed ledger write must not be able to break a reply.
 */
export async function settleInBackground(pending: unknown): Promise<void> {
  if (!pending || typeof (pending as any).then !== 'function') return;

  const runtime = (globalThis as any).EdgeRuntime;
  if (typeof runtime?.waitUntil === 'function') {
    runtime.waitUntil(pending);
    return;
  }

  // Promise.resolve() first: a bare thenable has no .catch() of its own.
  await Promise.resolve(pending).catch(() => {});
}

export function normalizeStream(
  upstream: ReadableStream<Uint8Array>,
  options: NormalizeStreamOptions = {},
): ReadableStream<Uint8Array> {
  const { onComplete = null, fallbackInputTokens = 0, sanitize = (t: string) => t } = options;

  const enc = new TextEncoder();
  let closed = false;

  return new ReadableStream({
    start(controller) {
      let curEvent: string | null = null;
      let curDataLines: string[] = [];

      const send = (evt: string, obj: any) => {
        if (closed) return;
        try {
          if (evt === 'message.completed' && obj.text) {
            try {
              obj.text = sanitize(obj.text);
            } catch (sanitizeErr) {
              console.error('⚠️ Sanitization failed, using original text:', sanitizeErr);
            }
          }
          controller.enqueue(enc.encode(`event: ${evt}\ndata: ${JSON.stringify(obj)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch { /* already closed */ }
      };

      let accumulatedText = '';
      let completedEmitted = false;
      let usageRecorded = false;
      const seen = new Set<string>();
      let dedupeCounter = 0;

      // RETAIN the promise onComplete returns. Firing and forgetting it leaves an
      // unmarked promise racing isolate teardown — see the module header.
      let meteringPromise: unknown = null;

      const completeOnce = (payload: any) => {
        if (usageRecorded) return;
        usageRecorded = true;
        try {
          const started = onComplete?.({
            text: accumulatedText || payload?.text || payload?.response?.output_text || '',
            tokensUsed: getUsageTotalTokens(payload, fallbackInputTokens, accumulatedText),
          });
          if (started && typeof (started as any).then === 'function') meteringPromise = started;
        } catch (trackingError) {
          console.warn('⚠️ Token completion callback failed:', trackingError);
        }
      };

      /** Must run BEFORE safeClose() on every exit path. */
      const settleMetering = async () => {
        const pending = meteringPromise;
        meteringPromise = null;
        await settleInBackground(pending);
      };

      const reader = upstream
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(
          new TransformStream<string, string>({
            start() {},
            transform(chunk, ctl) {
              const lines = chunk.split(/\r?\n/);
              for (const line of lines) ctl.enqueue(line);
            },
          }),
        )
        .getReader();

      (async () => {
        try {
          while (true) {
            const { value: line, done } = await reader.read();
            if (done) break;
            if (line === '') {
              if (curEvent && curDataLines.length) {
                const dataStr = curDataLines.join('\n');
                try {
                  const json = JSON.parse(dataStr);

                  if (json?.response?.instructions) {
                    json.response.instructions = '[redacted]';
                  }

                  const eventType = json?.type || curEvent;

                  if (eventType === 'reasoning' || curEvent.includes('reasoning')) {
                    curEvent = null;
                    curDataLines = [];
                    continue;
                  }

                  if (eventType === 'message') {
                    const message = json?.message;
                    if (message && Array.isArray(message.content)) {
                      for (const part of message.content) {
                        if (part.type === 'output_text' && part.text) {
                          accumulatedText += part.text;
                          send('message.delta', { textDelta: part.text });
                        }
                      }
                    }
                  } else if (curEvent.includes('output_text.delta') || curEvent.includes('text.delta')) {
                    const idx = json?.index ?? json?.delta_index ?? json?.offset ?? dedupeCounter++;
                    const key = `${json?.sequence_number ?? ''}:${json?.item_id ?? ''}:${json?.content_index ?? ''}:${idx}`;
                    if (!seen.has(key)) {
                      seen.add(key);
                      const delta = json?.delta ?? json?.text ?? '';
                      if (typeof delta === 'string' && delta.length) {
                        accumulatedText += delta;
                        send('message.delta', { textDelta: delta });
                      }
                    }
                  } else if (eventType === 'response.completed' || curEvent.includes('response.completed')) {
                    if (!accumulatedText && json?.response?.output_text) {
                      const fallbackText = json.response.output_text;
                      send('message.completed', { text: fallbackText });
                      accumulatedText = fallbackText;
                      completedEmitted = true;
                    } else if (accumulatedText && !completedEmitted) {
                      send('message.completed', { text: accumulatedText });
                      completedEmitted = true;
                    }
                    completeOnce(json);
                    await reader.cancel().catch(() => {});
                    break;
                  } else if (curEvent === 'done' || curEvent.includes('completed')) {
                    if (!completedEmitted) {
                      send('message.completed', { text: accumulatedText || '' });
                      completedEmitted = true;
                    }
                    completeOnce(json);
                    await reader.cancel().catch(() => {});
                    break;
                  } else if (curEvent.includes('response.incomplete')) {
                    const reason = json?.response?.incomplete_details?.reason;
                    if (reason === 'max_output_tokens') send('run.status', { phase: 'truncated' });
                  } else if (curEvent.includes('status') || curEvent.includes('in_progress') || curEvent.includes('output_item')) {
                    send('run.status', { phase: json?.status ?? 'processing' });
                  } else if (curEvent.includes('error')) {
                    send('error', { message: 'Uhuru encountered an issue. Please try again.' });
                  }
                } catch {
                  if (curEvent && (curEvent.includes('output_text.delta') || curEvent.includes('text.delta'))) {
                    const looksJson = /^\s*[{[]/.test(dataStr);
                    if (!looksJson) {
                      send('message.delta', { textDelta: dataStr });
                    }
                  }
                }
              }
              curEvent = null;
              curDataLines = [];
              continue;
            }
            if (line.startsWith('event:')) {
              curEvent = line.slice(6).trim();
              continue;
            }
            if (line.startsWith('data:')) {
              curDataLines.push(line.slice(5));
              continue;
            }
          }
          if (!completedEmitted) {
            send('message.completed', { text: accumulatedText || '' });
          }
          completeOnce({ text: accumulatedText });
          await settleMetering();
          safeClose();
        } catch {
          if (!completedEmitted) {
            send('error', { message: 'Uhuru stream interrupted. Please try again.' });
          }
          await settleMetering();
          safeClose();
        }
      })();
    },
  });
}
