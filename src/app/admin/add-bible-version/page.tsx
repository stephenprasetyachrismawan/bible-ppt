'use client'
import React, { useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import addData from "@/firebase/firestore/addData";
import { v4 as uuidv4 } from 'uuid';

export default function AddBibleVersion() {
    const { user } = useAuthContext() as { user: any };
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        language: '',
        description: '',
    });

    React.useEffect(() => {
        if (user == null) router.push("/signin");
    }, [user, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            // Generate a unique ID for the Bible version
            const bibleId = uuidv4();
            
            // Prepare data for Firestore
            const bibleData = {
                ...formData,
                id: bibleId,
                createdAt: new Date().toISOString(),
                createdBy: user.uid,
                updatedAt: new Date().toISOString()
            };
            
            // Save to Firestore
            const { result, error } = await addData('bible', bibleId, bibleData);
            
            if (error) {
                throw new Error(error.toString() || "Failed to add Bible version");
            }
            
            // Success notification
            alert("Versi Bible berhasil ditambahkan!");
            
            // Reset form
            setFormData({
                name: '',
                shortName: '',
                language: '',
                description: '',
            });
        } catch (err: any) {
            console.error("Error submitting form:", err);
            setError(err.message || "Terjadi kesalahan saat menambahkan versi Bible.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-2 mb-6">
                <button 
                    onClick={() => router.back()} 
                    className="btn btn-ghost btn-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <h1 className="text-3xl font-bold">Tambah Versi Bible</h1>
            </div>

            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    {error && (
                        <div className="alert alert-error mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-control w-full mb-4">
                            <label className="label">
                                <span className="label-text">Nama Versi Bible</span>
                            </label>
                            <input 
                                type="text" 
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Contoh: Terjemahan Baru"
                                className="input input-bordered w-full" 
                                required
                            />
                        </div>

                        <div className="form-control w-full mb-4">
                            <label className="label">
                                <span className="label-text">Nama Pendek</span>
                            </label>
                            <input 
                                type="text" 
                                name="shortName"
                                value={formData.shortName}
                                onChange={handleChange}
                                placeholder="Contoh: TB"
                                className="input input-bordered w-full" 
                                required
                            />
                        </div>

                        <div className="form-control w-full mb-4">
                            <label className="label">
                                <span className="label-text">Bahasa</span>
                            </label>
                            <select 
                                name="language"
                                value={formData.language}
                                onChange={handleChange}
                                className="select select-bordered w-full"
                                required
                            >
                                <option value="" disabled>Pilih bahasa</option>
                                <option value="id">Indonesia</option>
                                <option value="en">Inggris</option>
                                <option value="other">Lainnya</option>
                            </select>
                        </div>

                        <div className="form-control w-full mb-4">
                            <label className="label">
                                <span className="label-text">Deskripsi</span>
                            </label>
                            <textarea 
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Deskripsi singkat tentang versi Bible ini"
                                className="textarea textarea-bordered w-full"
                                rows={3} 
                            />
                        </div>

                        <div className="card-actions justify-end">
                            <button 
                                type="button" 
                                onClick={() => router.back()}
                                className="btn btn-ghost"
                                disabled={loading}
                            >
                                Batal
                            </button>
                            <button 
                                type="submit" 
                                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                                disabled={loading}
                            >
                                {loading ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 