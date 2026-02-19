interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div
      className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-8 px-5 py-5 rounded-xl overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 120% at 50% 0%, rgba(255,106,0,0.08) 0%, transparent 70%)",
        borderBottom: "1px solid rgba(201,168,76,0.15)",
      }}
    >
      {/* Subtle top-edge torch glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(255,106,0,0.3), rgba(201,168,76,0.5), rgba(255,106,0,0.3), transparent)",
        }}
      />

      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && (
          <p
            className="text-text-muted mt-1"
            style={{ fontFamily: "var(--font-crimson, Georgia, serif)", fontSize: "1.05rem", fontStyle: "italic" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="sm:shrink-0">{action}</div>}
    </div>
  );
}
