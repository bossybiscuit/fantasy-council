"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="card ember-glow">
      <h2 className="text-xl font-bold text-text-primary mb-2 text-center">
        Reset Password
      </h2>
      <p className="text-sm text-text-muted text-center mb-6">
        Enter your email and we&apos;ll send a reset link.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {sent ? (
        <div className="text-center">
          <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-700/30 text-green-400 text-sm">
            Check your email for a password reset link.
          </div>
          <Link href="/login" className="text-sm text-accent-orange hover:underline">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}

      <div className="torch-divider mt-6" />

      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-text-muted hover:text-text-primary">
          Back to login
        </Link>
      </div>
    </div>
  );
}
