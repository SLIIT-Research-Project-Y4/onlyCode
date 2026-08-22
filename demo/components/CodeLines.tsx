import { clsColor } from "@/lib/logic";
import type { CodeLineView, Flag } from "@/lib/types";

export default function CodeLines({
  lines,
  onLineClick,
}: {
  lines: CodeLineView[];
  onLineClick?: (flag: Flag) => void;
}) {
  return (
    <>
      {lines.map((line) => {
        const f = line.flag;
        const tint = !f
          ? "transparent"
          : line.muted
            ? "transparent"
            : f.cls === "external_ai"
              ? "rgba(236,48,19,0.16)"
              : "rgba(255,151,132,0.10)";
        const bar = !f ? "transparent" : line.muted ? "var(--color-neutral-600)" : clsColor(f.cls);
        return (
          <div
            key={line.n}
            className="code-line"
            style={{ background: tint, cursor: f && onLineClick ? "pointer" : "default" }}
            onClick={f && onLineClick ? () => onLineClick(f) : undefined}
          >
            <span className="code-line-num">{line.n}</span>
            <span className="code-line-bar" style={{ background: bar }} />
            <code className="code-line-code">
              {line.tokens.length === 0
                ? " "
                : line.tokens.map((tok, i) => (
                    <span key={i} className={tok.cls ? `tok-${tok.cls}` : undefined}>
                      {tok.text}
                    </span>
                  ))}
            </code>
            {line.badgeText && (
              <span
                className="code-line-badge"
                style={{ background: line.muted ? "var(--color-neutral-700)" : f ? clsColor(f.cls) : undefined }}
              >
                {line.badgeText}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
