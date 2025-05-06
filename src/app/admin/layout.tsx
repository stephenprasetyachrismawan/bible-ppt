'use client'
import React from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import signOutUser from "@/firebase/auth/signout";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = useAuthContext() as { user: any };
  const router = useRouter();

  React.useEffect(() => {
    if (user == null) router.push("/signin");
  }, [user, router]);

  return (
    <div className="drawer lg:drawer-open">
      <input id="drawer-toggle" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
        {/* Navbar */}
        <div className="navbar bg-base-300">
          <div className="flex-none lg:hidden">
            <label htmlFor="drawer-toggle" className="btn btn-square btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </label>
          </div>
          <div className="flex-1">
            <span className="text-xl font-bold">Admin Dashboard</span>
          </div>
          <div className="flex-none">
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full">
                  <div className="flex items-center justify-center h-full bg-primary text-primary-content">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </div>
              </label>
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                <li><a onClick={async () => {
                  const { success, error } = await signOutUser();
                  if (success) {
                    router.push('/signin');
                  } else {
                    console.error('Logout failed:', error);
                  }
                }}>Logout</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Page content */}
        <div className="p-4">
          {children}
        </div>
      </div>
      
      {/* Sidebar */}
      <div className="drawer-side">
        <label htmlFor="drawer-toggle" className="drawer-overlay"></label> 
        <ul className="menu p-4 w-64 h-full bg-base-200 text-base-content">
          <li className="mb-2">
            <h2 className="menu-title text-lg font-bold">Bible PPT Admin</h2>
          </li>
          <li><Link href="/admin">Dashboard</Link></li>
          <li><Link href="/admin/add-bible-version">Tambah Versi Bible</Link></li>
        </ul>
      </div>
    </div>
  );
} 