import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  estimateTokensFromText,
  getUsageTotalTokens,
  normalizeStream,
  settleInBackground,
} from './stream_metering.ts';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Minimal upstream SSE that drives normalizeStream to a completed response. */
const COMPLETED_SSE =
  'event: response.completed\n' +
  'data: {"type":"response.completed","response":{"output_text":"Hello","usage":{"total_tokens":123}}}\n' +
  '\n';

function sseStream(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(text));
      c.close();
    },
  });
}

/** Drain to completion; resolves when the stream closes. */
async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
}

afterEach(() => {
  delete (globalThis as any).EdgeRuntime;
});

describe('settleInBackground', () => {
  test('blocks on the write when EdgeRuntime.waitUntil is unavailable', async () => {
    let landed = false;
    await settleInBackground(
      (async () => {
        await delay(10);
        landed = true;
      })(),
    );
    expect(landed).toBe(true);
  });

  test('hands the write to the runtime and returns without waiting when waitUntil exists', async () => {
    const held: unknown[] = [];
    (globalThis as any).EdgeRuntime = { waitUntil: (p: unknown) => held.push(p) };

    let landed = false;
    const never = new Promise<void>(() => {}).then(() => {
      landed = true;
    });

    await settleInBackground(never);

    expect(held).toHaveLength(1);
    expect(landed).toBe(false);
  });

  test('accepts a bare thenable that has no .catch method', async () => {
    // supabase-js query builders are PromiseLike: they implement then() and nothing
    // else. Calling .catch() directly on one throws a TypeError, which is how the
    // knowledge-base fetch silently returned empty. settleInBackground must not
    // reintroduce that assumption.
    const builderLike = { then: (res: (v: unknown) => void) => res({ error: null }) };
    await expect(settleInBackground(builderLike)).resolves.toBeUndefined();
  });

  test('swallows a rejected write rather than propagating it', async () => {
    await expect(settleInBackground(Promise.reject(new Error('db down')))).resolves.toBeUndefined();
  });

  test('ignores a non-thenable', async () => {
    await expect(settleInBackground(null)).resolves.toBeUndefined();
    await expect(settleInBackground(42)).resolves.toBeUndefined();
  });
});

describe('normalizeStream metering lifecycle', () => {
  test('settles the usage write BEFORE closing the response stream', async () => {
    // The regression this whole module exists for. If the write is started after
    // the stream closes, the edge runtime can drop the isolate mid-write and the
    // usage row is lost — chat keeps working while the meter silently freezes.
    const order: string[] = [];

    const out = normalizeStream(sseStream(COMPLETED_SSE), {
      onComplete: () =>
        (async () => {
          await delay(10); // a real RPC round-trip is not instant
          order.push('metered');
        })(),
    });

    await drain(out);
    order.push('closed');

    expect(order).toEqual(['metered', 'closed']);
  });

  test('reports the upstream-declared token total to the callback', async () => {
    let seen: number | null = null;

    const out = normalizeStream(sseStream(COMPLETED_SSE), {
      onComplete: (usage) => {
        seen = usage.tokensUsed;
      },
    });

    await drain(out);

    expect(seen).toBe(123);
  });

  test('does not block the response on a write that never settles, when waitUntil exists', async () => {
    const held: unknown[] = [];
    (globalThis as any).EdgeRuntime = { waitUntil: (p: unknown) => held.push(p) };

    const out = normalizeStream(sseStream(COMPLETED_SSE), {
      onComplete: () => new Promise<void>(() => {}), // never resolves
    });

    await drain(out); // must still close
    expect(held).toHaveLength(1);
  }, 2000);

  test('still closes the stream when the callback throws synchronously', async () => {
    // The warn is the behaviour under test, not noise — silence it so a real
    // unexpected warning during the suite stays visible.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const out = normalizeStream(sseStream(COMPLETED_SSE), {
      onComplete: () => {
        throw new Error('callback exploded');
      },
    });

    await expect(drain(out)).resolves.toContain('message.completed');
    expect(warn).toHaveBeenCalledOnce();
  });

  test('applies the injected sanitizer to the completed message', async () => {
    const out = normalizeStream(sseStream(COMPLETED_SSE), {
      sanitize: (t) => t.replace('Hello', 'REDACTED'),
    });

    const body = await drain(out);

    expect(body).toContain('REDACTED');
    expect(body).not.toContain('Hello');
  });
});

describe('getUsageTotalTokens', () => {
  test('prefers the upstream total when present', () => {
    expect(getUsageTotalTokens({ usage: { total_tokens: 500 } }, 10, 'abc')).toBe(500);
  });

  test('sums input and output when no total is given', () => {
    expect(getUsageTotalTokens({ usage: { input_tokens: 30, output_tokens: 12 } }, 10, 'abc')).toBe(42);
  });

  test('falls back to the estimate when usage is absent entirely', () => {
    // 8 chars / 4 = 2 output tokens, plus the 10-token input fallback.
    expect(getUsageTotalTokens({}, 10, 'abcdefgh')).toBe(12);
  });

  test('never returns zero for a real request', () => {
    expect(getUsageTotalTokens({}, 0, '')).toBeGreaterThan(0);
  });
});

describe('estimateTokensFromText', () => {
  test('is zero only for empty or non-string input', () => {
    expect(estimateTokensFromText('')).toBe(0);
    expect(estimateTokensFromText(undefined)).toBe(0);
    expect(estimateTokensFromText(1234)).toBe(0);
  });

  test('rounds up to whole tokens', () => {
    expect(estimateTokensFromText('a')).toBe(1);
    expect(estimateTokensFromText('abcde')).toBe(2);
  });
});
