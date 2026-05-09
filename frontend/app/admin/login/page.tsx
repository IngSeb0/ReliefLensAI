"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAdminToken } from "@/lib/adminAuth";
import type { AdminLoginResponse } from "@/lib/types";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/backend/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      setError("Invalid credentials");
      return;
    }
    const payload = (await response.json()) as AdminLoginResponse;
    setAdminToken(payload.access_token);
    router.push("/admin");
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-md panel rounded-[1.8rem] p-8">
        <h1 className="text-3xl text-white">Admin Login</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white" />
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button type="submit" className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950">Login</button>
        </form>
      </div>
    </main>
  );
}
