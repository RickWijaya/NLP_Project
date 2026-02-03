"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { API_URL } from "@/app/lib/api";

export default function ChatPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState("");
  const [error, setError] = useState("");
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const response = await fetch(`${API_URL}/chat/tenants`);
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      }
    } catch (err) {
      console.error("Failed to fetch tenants:", err);
    } finally {
      setLoading(false);
    }
  }

  function routeToChat(tenantId = null) {
    const targetTenant = tenantId || tenant;

    if (!targetTenant || targetTenant.length < 3) {
      setError("Tenant ID must be at least 3 characters");
      return;
    }

    const cleanTenant = targetTenant
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    router.push(`/chat/${cleanTenant}`);
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-6"
      style={{ backgroundColor: "var(--color-bg-dark-primary)" }}
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-[900px]">
        {/* Header */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-row items-center">
            <Image
              src="/kathy-avatar.png"
              alt="Kathy AI"
              width={70}
              height={70}
              className="object-contain"
            />
            <Image
              src="/kathy-text.png"
              alt="Kathy AI"
              width={200}
              height={70}
              className="object-contain -ml-12"
            />
          </div>
          <h1
            className="font-bold text-[28px] leading-8 tracking-wide m-0"
            style={{
              fontFamily: "var(--font-family-poppins)",
              color: "var(--color-button-primary)",
            }}
          >
            SELECT A CHAT BOT
          </h1>
          <p
            className="text-center text-sm m-0 max-w-md"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Choose an existing bot below or enter a custom tenant ID to start chatting
          </p>
        </div>

        {/* Active Tenants Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-button-primary)', animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-button-primary)', animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-button-primary)', animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : tenants.length > 0 ? (
          <div className="w-full">
            <h2
              className="text-sm font-medium mb-4 px-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Available Bots ({tenants.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenants.map((t) => (
                <button
                  key={t.tenant_id}
                  onClick={() => routeToChat(t.tenant_id)}
                  className="group flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                  style={{
                    backgroundColor: "var(--color-bg-card)",
                    border: "1px solid var(--color-border-slate)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold uppercase transition-all group-hover:scale-110"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.15)",
                      color: "var(--color-button-primary)",
                    }}
                  >
                    {t.business_name?.charAt(0) || t.tenant_id.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className="font-semibold text-base m-0 truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {t.business_name}
                    </p>
                    <p
                      className="text-xs m-0 truncate"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      /{t.tenant_id}
                    </p>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-gray-500 group-hover:text-emerald-400 transition-colors"
                  >
                    <path
                      d="M9 18l6-6-6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="text-center py-8 px-4 rounded-2xl w-full"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border-slate)",
            }}
          >
            <p style={{ color: "var(--color-text-secondary)" }}>
              No active bots found. Enter a tenant ID below to get started.
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 w-full max-w-md">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border-slate)" }}></div>
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>OR</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border-slate)" }}></div>
        </div>

        {/* Custom Tenant Input */}
        <div
          className="flex flex-col items-center p-6 gap-4 w-full max-w-md rounded-2xl"
          style={{ backgroundColor: "var(--color-bg-card)" }}
        >
          <h3
            className="text-sm font-medium m-0"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Enter Custom Tenant ID
          </h3>

          {error && (
            <div
              className="w-full p-3 rounded-lg text-center text-sm"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                border: "1px solid #ef4444",
                color: "#ef4444",
              }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 w-full">
            <input
              type="text"
              placeholder="e.g., my_company"
              value={tenant}
              onChange={(e) => {
                setTenant(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") routeToChat();
              }}
              className="flex-1 h-[48px] px-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              style={{
                backgroundColor: "var(--color-bg-dark-primary)",
                border: "1px solid var(--color-border-slate)",
                fontFamily: "var(--font-family-poppins)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              onClick={() => routeToChat()}
              className="h-[48px] px-6 rounded-xl font-semibold text-sm border-none cursor-pointer hover:opacity-90 transition-all duration-300 flex items-center gap-2"
              style={{
                backgroundColor: "var(--color-button-primary)",
                fontFamily: "var(--font-family-poppins)",
                color: "white",
              }}
            >
              Go
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
