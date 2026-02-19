import Link from "next/link";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

function SnuffedTorchIcon() {
  return (
    <div className="relative inline-flex items-center justify-center mb-4">
      <div className="animate-ember-pulse">
        <svg
          width="48"
          height="64"
          viewBox="0 0 48 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Torch handle */}
          <rect
            x="21"
            y="28"
            width="6"
            height="30"
            rx="3"
            fill="url(#handleGrad)"
          />
          {/* Torch bowl */}
          <path
            d="M14 18 C14 14 18 10 24 10 C30 10 34 14 34 18 L32 28 H16 Z"
            fill="url(#bowlGrad)"
          />
          {/* Ember glow at top of bowl — snuffed, just a faint ember */}
          <ellipse
            cx="24"
            cy="18"
            rx="7"
            ry="3.5"
            fill="rgba(255,106,0,0.25)"
          />
          {/* Tiny smoke wisps */}
          <path
            d="M22 12 Q20 8 22 4"
            stroke="rgba(180,160,140,0.35)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M25 11 Q27 7 25 3"
            stroke="rgba(180,160,140,0.25)"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
          <defs>
            <linearGradient id="handleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B4C2A" />
              <stop offset="100%" stopColor="#3D2910" />
            </linearGradient>
            <linearGradient id="bowlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B6340" />
              <stop offset="100%" stopColor="#5A3E22" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* Ember dot beneath */}
      <span
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-2 h-2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,106,0,0.6) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      {icon ? (
        <div className="text-5xl mb-4">{icon}</div>
      ) : (
        <SnuffedTorchIcon />
      )}
      <h3
        className="text-lg font-semibold text-text-primary mb-2"
        style={{ fontFamily: "var(--font-cinzel, serif)" }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-text-muted text-sm max-w-sm mx-auto"
          style={{ fontFamily: "var(--font-crimson, Georgia, serif)", fontSize: "1rem" }}
        >
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link href={action.href} className="btn-primary">
              {action.label}
            </Link>
          ) : (
            <button onClick={action.onClick} className="btn-primary">
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
