"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ChatPage() {
  const router = useRouter();
  const [tenant, setTenant] = useState("");
  const [error, setError] = useState("");

  function routeToChat() {
    if (!tenant || tenant.length < 3) {
      setError("Tenant ID must be at least 3 characters");
      return;
    }

    const cleanTenant = tenant
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    router.push(`/chat/${cleanTenant}`);
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "var(--color-bg-dark-primary)" }}
    >
      <div
        className="flex flex-col items-center p-[50px] gap-[25px] w-full max-w-[520px] rounded-[20px]"
        style={{ backgroundColor: "var(--color-bg-card)" }}
      >
        {/* Header with Logo */}
        <div className="flex flex-col items-center w-full gap-4">
          <div className="flex flex-row items-center">
            <Image
              src="/kathy-avatar.png"
              alt="Kathy AI"
              width={60}
              height={60}
              className="object-contain"
            />
            <Image
              src="/kathy-text.png"
              alt="Kathy AI"
              width={180}
              height={60}
              className="object-contain -ml-12"
            />
          </div>
          <h1
            className="font-bold text-[24px] leading-8 tracking-wide m-0"
            style={{
              fontFamily: "var(--font-family-poppins)",
              color: "var(--color-button-primary)",
            }}
          >
            OPEN CHAT
          </h1>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="w-full p-3 rounded-lg text-center"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              border: "1px solid #ef4444",
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        )}

        {/* Tenant Input */}
        <div className="flex flex-col items-start gap-[6px] w-full">
          <label
            htmlFor="tenant"
            className="font-normal text-[14px] leading-[21px]"
            style={{
              fontFamily: "var(--font-family-poppins)",
              color: "var(--color-text-primary)",
            }}
          >
            Company ID / Tenant *
          </label>

          <input
            id="tenant"
            type="text"
            placeholder="contoh: toko_baju, bank_abc"
            value={tenant}
            onChange={(e) => {
              setTenant(e.target.value);
              setError("");
            }}
            className="w-full h-[44px] px-4 rounded-[8px] text-[14px] focus:outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid var(--color-border-slate)",
              fontFamily: "var(--font-family-poppins)",
              color: "var(--color-text-primary)",
            }}
          />
        </div>

        {/* Button */}
        <button
          onClick={routeToChat}
          className="w-full h-[50px] rounded-[8px] font-bold text-[18px] leading-[27px] text-center border-none cursor-pointer hover:opacity-90 transition-all duration-300 mt-2"
          style={{
            backgroundColor: "var(--color-button-primary)",
            fontFamily: "var(--font-family-poppins)",
            color: "var(--color-text-primary)",
          }}
        >
          Start Chat
        </button>
      </div>
    </main>
  );
}
