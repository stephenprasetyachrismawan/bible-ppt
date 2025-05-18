'use client'
import React from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
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
    <div className="flex flex-col bg-white text-black">
      {/* Navbar untuk mobile saja */}
      <div className="navbar bg-gray-100 text-black lg:hidden">
        <div className="flex-1">
          <span className="text-xl font-bold text-black">Admin Dashboard</span>
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
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-white text-black border border-gray-200 rounded-box w-52">
              <li><a onClick={async () => {
                const { success, error } = await signOutUser();
                if (success) {
                  router.push('/signin');
                } else {
                  console.error('Logout failed:', error);
                }
              }} className="text-black hover:bg-gray-100">Logout</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Page content */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
} 