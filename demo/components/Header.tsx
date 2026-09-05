export default function Header({
  navItems = [],
  current,
  onNav,
  rightSlot,
}: {
  navItems?: { id: string; label: string }[];
  current?: string;
  onNav?: (id: string) => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "10px 20px",
        borderBottom: "2px solid var(--color-divider)",
        flex: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em" }}>
          CodeTrace
        </span>
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
          integrity for technical interviews
        </span>
      </div>

      {navItems.length > 0 && (
        <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item${current === item.id ? " is-active" : ""}`}
              onClick={() => onNav?.(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>{rightSlot}</div>
    </div>
  );
}
