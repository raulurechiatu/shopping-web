"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CreateOrJoinList() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("My Shopping List");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error } =
      mode === "create"
        ? await supabase.rpc("create_list", { list_name: name })
        : await supabase.rpc("join_list_by_code", { code: code.trim() });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/lists/${data.id}`);
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex gap-2 rounded-lg bg-gray-100 p-1 text-sm font-medium">
        <button
          className={`flex-1 rounded-md py-2 ${mode === "create" ? "bg-white shadow-sm" : "text-gray-500"}`}
          onClick={() => setMode("create")}
        >
          Create list
        </button>
        <button
          className={`flex-1 rounded-md py-2 ${mode === "join" ? "bg-white shadow-sm" : "text-gray-500"}`}
          onClick={() => setMode("join")}
        >
          Join list
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "create" ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="List name"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
          />
        ) : (
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Invite code"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "create" ? "Create list" : "Join list"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
