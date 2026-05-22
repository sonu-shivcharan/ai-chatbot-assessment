interface MessageContentProps {
  content: string;
}

export function MessageContent({ content }: MessageContentProps) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-[15px] leading-relaxed wrap-break-word text-foreground">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : "";
          const code = match ? match[2] : part.slice(3, -3).trim();

          return (
            <div
              key={index}
              className="my-3 rounded-lg border bg-zinc-950 dark:bg-zinc-900 overflow-hidden shadow-sm"
            >
              <div className="bg-muted px-4 py-1.5 text-xs text-muted-foreground font-mono border-b flex justify-between items-center">
                <span>{lang || "code"}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-[10px]"
                >
                  Copy
                </button>
              </div>
              <pre className="p-4 overflow-x-auto font-mono text-xs text-zinc-300 dark:text-zinc-200">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const paragraphs = part.split(/\n\n+/);
        return paragraphs.map((p, pIdx) => {
          if (!p.trim()) return null;
          const boldParts = p.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={`${index}-${pIdx}`} className="mb-2">
              {boldParts.map((bp, bpIdx) => {
                if (bp.startsWith("**") && bp.endsWith("**")) {
                  return (
                    <strong
                      key={bpIdx}
                      className="font-semibold text-foreground"
                    >
                      {bp.slice(2, -2)}
                    </strong>
                  );
                }
                return bp;
              })}
            </p>
          );
        });
      })}
    </div>
  );
}
