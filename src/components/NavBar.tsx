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
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
        <Link href="/" className="text-gray-900 font-semibold text-lg">
          TaskCo
        </Link>

        {loggedIn ? (
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Log out
          </button>
        ) : !isAuthPage ? (
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Log in
          </Link>
        ) : null}
      </div>
    </header>
  );
}
