interface TribeBadgeProps {
  tribe: string;
  color?: string | null;
  size?: "sm" | "md";
  /** Compact mode: just a colored dot + first letter, no text */
  dotOnly?: boolean;
}

export default function TribeBadge({
  tribe,
  color,
  size = "md",
  dotOnly = false,
}: TribeBadgeProps) {
  const c = color || "#FF6B00"; // fallback to brand orange

  if (dotOnly) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-medium"
        style={{ color: c }}
        title={tribe}
      >
        <span
          className="inline-block rounded-full w-2 h-2 shrink-0"
          style={{ backgroundColor: c }}
        />
        {tribe[0]}
      </span>
    );
  }

  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-0.5";
  const text = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`inline-block font-medium rounded border ${padding} ${text}`}
      style={{
        backgroundColor: `${c}20`,
        borderColor: `${c}60`,
        color: c,
      }}
    >
      {tribe}
    </span>
  );
}
