export default function CodeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const lineCount = value.split("\n").length;

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    onChange(value.slice(0, start) + "    " + value.slice(end));
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 4;
    });
  };

  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      <div aria-hidden style={{ flex: "none", width: 46, paddingTop: 14, textAlign: "right", userSelect: "none" }}>
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="mono" style={{ fontSize: 12.5, lineHeight: "20px", color: "#605d5d", paddingRight: 12 }}>
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        className="mono"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        wrap="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        style={{
          flex: 1,
          minWidth: 0,
          border: 0,
          outline: "none",
          resize: "none",
          background: "transparent",
          color: "#d7d3d3",
          fontSize: 12.5,
          lineHeight: "20px",
          padding: "14px 16px 40px 12px",
          height: lineCount * 20 + 54,
        }}
      />
    </div>
  );
}
