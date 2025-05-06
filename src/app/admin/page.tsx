'use client'
import React, { useState, useEffect } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import getAllDocuments from "@/firebase/firestore/getAllData";

type BibleVersion = {
    id: string;
    name: string;
    shortName: string;
    language: string;
    description: string;
    createdAt: string;
};

function Page() {
    const { user } = useAuthContext() as { user: any };
    const router = useRouter();
    const [bibleVersions, setBibleVersions] = useState<BibleVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user == null) router.push("/signin");
    }, [user, router]);

    useEffect(() => {
        async function fetchBibleVersions() {
            setLoading(true);
            try {
                const { result, error } = await getAllDocuments('bible');
                if (error) {
                    throw new Error(error.toString() || "Failed to fetch Bible versions");
                }
                setBibleVersions(result);
            } catch (err: any) {
                console.error("Error fetching Bible versions:", err);
                setError(err.message || "Failed to load Bible versions");
            } finally {
                setLoading(false);
            }
        }

        fetchBibleVersions();
    }, []);

    const languageMap: Record<string, string> = {
        id: "Indonesia",
        en: "Inggris",
        other: "Lainnya"
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            
            {error && (
                <div className="alert alert-error mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}
            
            <div className="stats shadow mb-8 w-full">
                <div className="stat">
                    <div className="stat-figure text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                        </svg>
                    </div>
                    <div className="stat-title">Total Versi Bible</div>
                    <div className="stat-value text-primary">
                        {loading ? (
                            <span className="loading loading-dots loading-md"></span>
                        ) : (
                            bibleVersions.length
                        )}
                    </div>
                </div>
            </div>
            
            <div className="card bg-base-100 shadow-xl mb-8">
                <div className="card-body">
                    <h2 className="card-title">Kelola Versi Bible</h2>
                    <p>Tambahkan dan kelola berbagai versi Bible untuk digunakan dalam pembuatan PowerPoint.</p>
                    <div className="card-actions justify-end mt-4">
                        <Link href="/admin/add-bible-version" className="btn btn-primary">
                            Tambah Versi Bible
                        </Link>
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title mb-4">Daftar Versi Bible</h2>
                    
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : bibleVersions.length === 0 ? (
                        <div className="alert">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>Belum ada versi Bible. Silakan tambahkan versi Bible terlebih dahulu.</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra">
                                <thead>
                                    <tr>
                                        <th>Nama</th>
                                        <th>Kode</th>
                                        <th>Bahasa</th>
                                        <th>Tanggal Dibuat</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bibleVersions.map((version) => (
                                        <tr key={version.id}>
                                            <td>{version.name}</td>
                                            <td>{version.shortName}</td>
                                            <td>{languageMap[version.language] || version.language}</td>
                                            <td>{new Date(version.createdAt).toLocaleDateString('id-ID')}</td>
                                            <td>
                                                <Link 
                                                    href={`/admin/manage-bible/${version.id}`}
                                                    className="btn btn-sm btn-primary"
                                                >
                                                    Kelola Bible
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Page;