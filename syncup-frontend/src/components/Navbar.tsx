"use client";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "./ui/Button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/60 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg transition-transform group-hover:scale-105">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
            SyncUp AI
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/jobs" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
            Browse Jobs
          </Link>
          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
              <div className="h-6 w-[1px] bg-slate-300"></div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-800">
                  {user.name} <span className="text-xs text-slate-500 font-normal">({user.role})</span>
                </span>
                <Button variant="outline" onClick={handleLogout} className="border-slate-300 hover:bg-slate-100 text-slate-700 cursor-pointer">
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-slate-600 hover:text-blue-600 cursor-pointer">Log in</Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md cursor-pointer">
                  Sign Up Free
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
