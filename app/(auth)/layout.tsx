export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔥</div>
          <h1 className="text-3xl font-bold text-gradient-fire">The Council</h1>
          <p className="text-text-muted mt-2">Survivor Fantasy League</p>
        </div>
        {children}
      </div>
    </div>
  );
}
