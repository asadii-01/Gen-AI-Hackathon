"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiAcademicCap, HiArrowRightOnRectangle } from "react-icons/hi2";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  return (
    <nav className="glass sticky top-0 z-50 border-b border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4] shadow-lg shadow-purple-500/20 transition-shadow group-hover:shadow-purple-500/40">
              <HiAcademicCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="gradient-text">Socratic</span>
              <span className="text-[var(--text-primary)]">Canvas</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                pathname === "/"
                  ? "text-[var(--accent-purple)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Topics
            </Link>

            {/* Auth section */}
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-4">
                    {/* Dashboard link */}
                    <Link
                      href="/dashboard"
                      className={`text-sm font-medium transition-colors ${
                        pathname === "/dashboard"
                          ? "text-[var(--accent-purple)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Dashboard
                    </Link>

                    {/* User avatar + name — links to dashboard */}
                    <Link href="/dashboard" className="flex items-center gap-2 group">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4] text-xs font-bold text-white uppercase transition-shadow group-hover:shadow-lg group-hover:shadow-purple-500/30">
                        {user.username.charAt(0)}
                      </div>
                      <span className="hidden sm:inline text-sm font-medium text-[var(--text-primary)]">
                        {user.username}
                      </span>
                    </Link>

                    {/* Logout button */}
                    <button
                      onClick={logout}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-all hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <HiArrowRightOnRectangle className="h-4 w-4" />
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/login"
                      className={`text-sm font-medium transition-colors ${
                        pathname === "/login"
                          ? "text-[var(--accent-purple)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] px-3.5 py-1.5 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition-all hover:shadow-purple-500/40 hover:scale-[1.03]"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
