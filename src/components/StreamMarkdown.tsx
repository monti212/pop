import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  text: string;
  isStreaming?: boolean;
  dark?: boolean;
  components?: any; // pass your custom component map
};

// keep markdown well-formed during stream to avoid style flips
function stabilizeMarkdownStream(s: string) {
  if (!s) return s;

  // 1) balance triple backticks
  const fences = (s.match(/```/g) || []).length;
  if (fences % 2 === 1) s += "\n```";

  // 2) close triple tildes too (if you ever use them)
  const tildes = (s.match(/~~~\n?/g) || []).length;
  if (tildes % 2 === 1) s += "\n~~~";

  // 3) soften dangling inline markers at the very end to stop italic/bold spill
  // (only while streaming; final render gets the true text)
  // Example: "This is *incomple" -> "This is \\*incomple"
  s = s.replace(/(\*|_|~|`)+$/g, (m) => "\\" + m);

  return s;
}

const StreamMarkdown = React.memo(function StreamMarkdown({ text, isStreaming, dark, components }: Props) {
  const [renderText, setRenderText] = React.useState(text);
  const lastChunkRef = React.useRef(text);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    lastChunkRef.current = text;

    if (!isStreaming) {
      // final render: exact text, no stabilizing
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setRenderText(text);
      return;
    }

    // throttle to animation frames (≈60 fps max)
    const tick = () => {
      const next = stabilizeMarkdownStream(lastChunkRef.current);
      setRenderText(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [text, isStreaming]);

  return (
    <div className={`prose max-w-none ${dark ? "prose-invert" : "prose-neutral"} text-[15px] leading-7`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {renderText}
      </ReactMarkdown>
    </div>
  );
});

export default StreamMarkdown;