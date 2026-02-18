"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Register with Supabase Auth — pass username/display_name as metadata
    // so the database trigger creates the profile row automatically.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase().trim(),
          display_name: displayName.trim() || username.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="card ember-glow">
      <h2 className="text-xl font-bold text-text-primary mb-6 text-center">
        Join The Council
      </h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="username">
              Username *
            </label>
            <input
              id="username"
              type="text"
              className="input"
              placeholder="tribechamp"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              pattern="[a-zA-Z0-9_]+"
              title="Letters, numbers, underscores only"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="displayName">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              className="input"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="email">
            Email *
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

        <div>
          <label className="label" htmlFor="password">
            Password *
          </label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="8+ characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <div className="torch-divider mt-6" />

      <p className="text-center text-sm text-text-muted mt-4">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-accent-orange hover:text-orange-400 font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
