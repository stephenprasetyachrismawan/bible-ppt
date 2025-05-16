'use client'
import React, { useState, useEffect } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import getDocument from "@/firebase/firestore/getData";
import getSubCollection from "@/firebase/firestore/getSubCollection";
import addSubCollectionDoc from "@/firebase/firestore/addSubCollection";
import deleteSubCollectionDoc from "@/firebase/firestore/deleteSubCollectionDoc";
import { v4 as uuidv4 } from 'uuid';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type BibleBook = {
    id: string;
    name: string;
    shortName: string;
    number: number;
    chaptersCount: number;
    testament: "old" | "new";
    createdAt: string;
    updatedAt: string;
};

type BibleChapter = {
    id: string;
    number: number;
    title: string;
    createdAt: string;
    updatedAt: string;
    verseCount?: number;
};

type BibleVersion = {
    id: string;
    name: string;
    shortName: string;
    language: string;
    description: string;
    createdAt: string;
    updatedAt: string;
};

export default function ManageBookChapters() {
    // Get params using useParams with proper TypeScript generics
    const params = useParams<{
        id: string;
        bookId: string;
    }>();
    const id = params.id;
    const bookId = params.bookId;
    
    const { user } = useAuthContext() as { user: any };
    const router = useRouter();
    const [book, setBook] = useState<BibleBook | null>(null);
    const [chapters, setChapters] = useState<BibleChapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [chaptersLoading, setChaptersLoading] = useState(true);
    const [addingChapter, setAddingChapter] = useState(false);
    const [editingChapter, setEditingChapter] = useState(false);
    const [deletingChapter, setDeletingChapter] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chaptersError, setChaptersError] = useState<string | null>(null);
    const [newChapter, setNewChapter] = useState({
        number: 0,
        title: ''
    });
    const [currentChapter, setCurrentChapter] = useState<BibleChapter | null>(null);
    const [showChapterForm, setShowChapterForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (user == null) router.push("/signin");
    }, [user, router]);

    useEffect(() => {
        async function fetchBook() {
            setLoading(true);
            try {
                const { result, error } = await getDocument('bible', id, 'books', bookId);
                if (error) {
                    throw new Error(error.toString() || "Failed to fetch book");
                }
                
                if (!result || !result.exists()) {
                    throw new Error("Book not found");
                }
                
                const bookData = {
                    id: result.id,
                    ...result.data() as Omit<BibleBook, 'id'>
                };
                
                setBook(bookData);
            } catch (err: any) {
                console.error("Error fetching book:", err);
                setError(err.message || "Failed to load book");
            } finally {
                setLoading(false);
            }
        }

        fetchBook();
    }, [id, bookId]);

    useEffect(() => {
        async function fetchChapters() {
            if (!id || !bookId) return;
            
            setChaptersLoading(true);
            try {
                const { result, error } = await getSubCollection('bible', id, 'books', bookId, 'chapters');
                if (error) {
                    throw new Error(error.toString() || "Failed to fetch chapters");
                }
                
                // Sort chapters by number
                const sortedChapters = result.sort((a: BibleChapter, b: BibleChapter) => a.number - b.number);
                
                // Fetch verse counts for each chapter
                const chaptersWithCounts = await Promise.all(
                    sortedChapters.map(async (chapter: BibleChapter) => {
                        try {
                            const chapterRef = doc(db, 'bible', id, 'books', bookId, 'chapters', chapter.id);
                            const versesCollectionRef = collection(chapterRef, 'verses');
                            const versesSnapshot = await getDocs(versesCollectionRef);
                            
                            // Count only items with type 'verse' (not 'title')
                            let verseCount = 0;
                            versesSnapshot.forEach(doc => {
                                const data = doc.data();
                                if (data.type === 'verse' || !data.type) { // Count as verse if type is missing (backward compatibility)
                                    verseCount++;
                                }
                            });
                            
                            return {
                                ...chapter,
                                verseCount
                            };
                        } catch (err) {
                            console.error(`Error fetching verses for chapter ${chapter.number}:`, err);
                            return {
                                ...chapter,
                                verseCount: 0
                            };
                        }
                    })
                );
                
                setChapters(chaptersWithCounts);
            } catch (err: any) {
                console.error("Error fetching chapters:", err);
                setChaptersError(err.message || "Failed to load chapters");
            } finally {
                setChaptersLoading(false);
            }
        }

        fetchChapters();
    }, [id, bookId]);

    const handleEditChapter = (chapter: BibleChapter) => {
        setCurrentChapter(chapter);
        setNewChapter({
            number: chapter.number,
            title: chapter.title || ''
        });
        setIsEditing(true);
        setShowChapterForm(true);
    };

    const handleDeleteChapter = async (chapter: BibleChapter) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus pasal ${chapter.number}?`)) {
            return;
        }
        
        setDeletingChapter(true);
        setCurrentChapter(chapter);
        
        try {
            const { error } = await deleteSubCollectionDoc('bible', id, 'books', bookId, 'chapters', chapter.id);
            
            if (error) {
                throw new Error(error.toString() || "Failed to delete chapter");
            }
            
            // Remove chapter from state
            setChapters(prev => prev.filter(c => c.id !== chapter.id));
            
        } catch (err: any) {
            console.error("Error deleting chapter:", err);
            setChaptersError(err.message || "Failed to delete chapter");
        } finally {
            setDeletingChapter(false);
            setCurrentChapter(null);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setCurrentChapter(null);
        setNewChapter({
            number: 0,
            title: ''
        });
        setShowChapterForm(false);
    };

    const handleAddChapter = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Check if a chapter with the same number already exists
        const existingChapter = chapters.find(
            chapter => chapter.number === newChapter.number && 
            (!isEditing || (isEditing && chapter.id !== currentChapter?.id))
        );
        
        if (existingChapter) {
            setChaptersError(`Pasal dengan nomor ${newChapter.number} sudah ada`);
            return;
        }
        
        if (isEditing) {
            // Handle editing existing chapter
            setEditingChapter(true);
            
            try {
                if (!currentChapter) {
                    throw new Error("No chapter selected for editing");
                }
                
                const chapterData = {
                    ...newChapter,
                    updatedAt: new Date().toISOString(),
                };
                
                const { error } = await addSubCollectionDoc(
                    'bible', id, 'books', bookId, 'chapters', currentChapter.id, chapterData
                );
                
                if (error) {
                    throw new Error(error.toString() || "Failed to update chapter");
                }
                
                // Update the chapter in state
                setChapters(prev => 
                    prev.map(chapter => 
                        chapter.id === currentChapter.id 
                            ? { 
                                ...chapter, 
                                ...chapterData 
                              } 
                            : chapter
                    ).sort((a, b) => a.number - b.number)
                );
                
                // Reset form
                setNewChapter({
                    number: 0,
                    title: ''
                });
                
                setIsEditing(false);
                setCurrentChapter(null);
                setShowChapterForm(false);
                
            } catch (err: any) {
                console.error("Error updating chapter:", err);
                setChaptersError(err.message || "Failed to update chapter");
            } finally {
                setEditingChapter(false);
            }
        } else {
            // Add new chapter
            setAddingChapter(true);
            
            try {
                const chapterId = uuidv4();
                const chapterData = {
                    ...newChapter,
                    id: chapterId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: user.uid
                };
                
                const { error } = await addSubCollectionDoc(
                    'bible', id, 'books', bookId, 'chapters', chapterId, chapterData
                );
                
                if (error) {
                    throw new Error(error.toString() || "Failed to add chapter");
                }
                
                // Add the new chapter to the state
                setChapters(prev => [...prev, chapterData as BibleChapter].sort((a, b) => a.number - b.number));
                
                // Reset form
                setNewChapter({
                    number: 0,
                    title: ''
                });
                
                setShowChapterForm(false);
                
            } catch (err: any) {
                console.error("Error adding chapter:", err);
                setChaptersError(err.message || "Failed to add chapter");
            } finally {
                setAddingChapter(false);
            }
        }
    };

    const handleAddMissingChapters = async () => {
        if (!book) return;
        
        if (!window.confirm(`Apakah Anda yakin ingin menambahkan semua pasal yang belum ada (dari 1 sampai ${book.chaptersCount})?`)) {
            return;
        }
        
        setAddingChapter(true);
        
        try {
            // Find which chapter numbers are missing
            const existingNumbers = chapters.map(chapter => chapter.number);
            const missingNumbers = [];
            
            for (let i = 1; i <= book.chaptersCount; i++) {
                if (!existingNumbers.includes(i)) {
                    missingNumbers.push(i);
                }
            }
            
            // Add all missing chapters
            for (const number of missingNumbers) {
                const chapterId = uuidv4();
                const chapterData = {
                    number,
                    title: '',
                    id: chapterId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: user.uid
                };
                
                await addSubCollectionDoc(
                    'bible', id, 'books', bookId, 'chapters', chapterId, chapterData
                );
            }
            
            // Refetch chapters
            const { result, error } = await getSubCollection('bible', id, 'books', bookId, 'chapters');
            if (error) {
                throw new Error(error.toString() || "Failed to fetch chapters after adding");
            }
            
            // Sort chapters by number
            const sortedChapters = result.sort((a: BibleChapter, b: BibleChapter) => a.number - b.number);
            setChapters(sortedChapters);
            
        } catch (err: any) {
            console.error("Error adding missing chapters:", err);
            setChaptersError(err.message || "Failed to add missing chapters");
        } finally {
            setAddingChapter(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex flex-col gap-2 mb-6">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => router.back()} 
                        className="btn btn-ghost btn-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold">
                        {book ? `Kelola Pasal - ${book.name}` : 'Kelola Pasal'}
                    </h1>
                </div>
                
                {book && (
                    <div className="text-sm breadcrumbs ml-10">
                        <ul>
                            <li><a onClick={() => router.push('/admin/manage-bible')}>Daftar Bible</a></li>
                            <li><a onClick={() => router.push(`/admin/manage-bible/${id}`)}>Kelola Buku</a></li>
                            <li className="font-semibold">{book.name} - Pasal</li>
                        </ul>
                    </div>
                )}
            </div>

            {error && (
                <div className="alert alert-error mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}
            
            {loading ? (
                <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            ) : book ? (
                <div className="grid gap-6">
                    {/* Book banner */}
                    <div className="bg-base-100 rounded-box shadow-xl p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-4xl font-bold text-indigo-600 mb-3">{book.name}</h2>
                            <p className="text-base-content/70">
                                {book.shortName} • {book.testament === 'old' ? 'Perjanjian Lama' : 'Perjanjian Baru'} • Buku #{book.number}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="bg-base-200 p-5 rounded-box">
                                <div className="text-xs uppercase font-semibold mb-1 opacity-60">Jumlah Pasal</div>
                                <div className="flex items-end gap-2">
                                    <div className="text-4xl font-bold">{book.chaptersCount}</div>
                                    <div className="text-sm opacity-60 pb-1">Total pasal dalam buku</div>
                                </div>
                            </div>

                            <div className="bg-base-200 p-5 rounded-box">
                                <div className="text-xs uppercase font-semibold mb-1 opacity-60">Pasal Tersedia</div>
                                <div className="flex items-end gap-2">
                                    <div className="text-4xl font-bold">{chapters.length}</div>
                                    <div className="text-sm opacity-60 pb-1">
                                        {chapters.length === book.chaptersCount 
                                            ? <span className="text-success">Lengkap</span> 
                                            : <span className="text-warning">{book.chaptersCount - chapters.length} belum tersedia</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Kelola Pasal</h2>
                            
                            {chaptersError && (
                                <div className="alert alert-error mt-4 mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{chaptersError}</span>
                                </div>
                            )}
                            
                            {chaptersLoading ? (
                                <div className="flex justify-center py-4">
                                    <span className="loading loading-spinner loading-md"></span>
                                </div>
                            ) : (
                                <>
                                    <div className="card-actions justify-between items-center mt-2 mb-4">
                                        <div>
                                            <span className="font-bold">Total Pasal: </span>
                                            <span className="badge badge-lg">{chapters.length}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {book && chapters.length < book.chaptersCount && (
                                                <button 
                                                    className={`btn btn-primary ${addingChapter ? 'loading' : ''}`}
                                                    onClick={handleAddMissingChapters}
                                                    disabled={addingChapter || editingChapter || deletingChapter}
                                                >
                                                    Tambah Semua Pasal
                                                </button>
                                            )}
                                            <button 
                                                className="btn btn-primary"
                                                onClick={() => {
                                                    if (showChapterForm && isEditing) {
                                                        handleCancelEdit();
                                                    } else {
                                                        setShowChapterForm(!showChapterForm);
                                                    }
                                                }}
                                                disabled={addingChapter || editingChapter || deletingChapter}
                                            >
                                                {showChapterForm ? (isEditing ? 'Batal Edit' : 'Batal') : 'Tambah Pasal'}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {showChapterForm && (
                                        <div className="bg-base-200 p-4 rounded-lg mb-4">
                                            <h3 className="font-bold text-lg mb-4">
                                                {isEditing ? 'Edit Pasal' : 'Tambah Pasal Baru'}
                                            </h3>
                                            <form onSubmit={handleAddChapter}>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div className="form-control">
                                                        <label className="label">
                                                            <span className="label-text">Nomor Pasal</span>
                                                        </label>
                                                        <input 
                                                            type="number" 
                                                            className="input input-bordered" 
                                                            value={newChapter.number || ''}
                                                            onChange={(e) => setNewChapter({...newChapter, number: parseInt(e.target.value)})}
                                                            min={1}
                                                            required
                                                        />
                                                    </div>
                                                    
                                                    <div className="form-control">
                                                        <label className="label">
                                                            <span className="label-text">Judul Pasal (Opsional)</span>
                                                        </label>
                                                        <input 
                                                            type="text" 
                                                            className="input input-bordered" 
                                                            value={newChapter.title}
                                                            onChange={(e) => setNewChapter({...newChapter, title: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-4 flex justify-end gap-2">
                                                    <button 
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={handleCancelEdit}
                                                        disabled={addingChapter || editingChapter}
                                                    >
                                                        Batal
                                                    </button>
                                                    <button 
                                                        type="submit" 
                                                        className={`btn btn-primary ${(addingChapter || editingChapter) ? 'loading' : ''}`}
                                                        disabled={addingChapter || editingChapter}
                                                    >
                                                        {isEditing ? 'Simpan Perubahan' : 'Simpan Pasal'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                    
                                    {chapters.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="table table-zebra">
                                                <thead>
                                                    <tr>
                                                        <th>Nomor</th>
                                                        <th>Jumlah Ayat</th>
                                                        <th>Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {chapters.map((chapter) => (
                                                        <tr key={chapter.id}>
                                                            <td>{chapter.number}</td>
                                                            <td>{chapter.verseCount || 0}</td>
                                                            <td>
                                                                <button 
                                                                    className="btn btn-sm btn-primary mr-2"
                                                                    onClick={() => handleEditChapter(chapter)}
                                                                    disabled={addingChapter || editingChapter || deletingChapter}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button 
                                                                    className={`btn btn-sm btn-error mr-2 ${deletingChapter && currentChapter?.id === chapter.id ? 'loading' : ''}`}
                                                                    onClick={() => handleDeleteChapter(chapter)}
                                                                    disabled={addingChapter || editingChapter || deletingChapter}
                                                                >
                                                                    Hapus
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-accent"
                                                                    onClick={() => router.push(`/admin/manage-bible/${id}/books/${bookId}/chapters/${chapter.id}`)}
                                                                    disabled={addingChapter || editingChapter || deletingChapter}
                                                                >
                                                                    Kelola Ayat
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="alert">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            <span>Belum ada pasal untuk buku ini. Tambahkan pasal atau gunakan tombol "Tambah Semua Pasal".</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}