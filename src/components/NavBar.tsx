'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'));
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    setLoggedIn(false);
    router.push('/login');
  }

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-black/5 sticky top-0 z-40 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 transition group-hover:bg-blue-700">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-sm tracking-tight">TaskCo</span>
        </Link>

        {/* Right side */}
        {loggedIn ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className={`text-xs font-medium transition-colors ${
                pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Projects
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
            >
              Log out
            </button>
          </div>
        ) : !isAuthPage ? (
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition"
            >
              Get started
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
