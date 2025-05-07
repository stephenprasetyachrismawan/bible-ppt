'use client'
import React, { useState, useEffect } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import getDocument from "@/firebase/firestore/getData";
import getSubCollection from "@/firebase/firestore/getSubCollection";
import addSubCollectionDoc from "@/firebase/firestore/addSubCollection";
import deleteSubCollectionDoc from "@/firebase/firestore/deleteSubCollectionDoc";
import addData from "@/firebase/firestore/addData";
import deleteDocument from "@/firebase/firestore/deleteData";
import { v4 as uuidv4 } from 'uuid';

type BibleVersion = {
    id: string;
    name: string;
    shortName: string;
    language: string;
    description: string;
    createdAt: string;
    updatedAt: string;
};

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

type PageProps = {
    params: {
        id: string;
    };
};

const defaultBooks = [
    // Perjanjian Lama (Old Testament) - 39 buku
    { name: "Kejadian", shortName: "Kej", number: 1, testament: "old", chaptersCount: 50 },
    { name: "Keluaran", shortName: "Kel", number: 2, testament: "old", chaptersCount: 40 },
    { name: "Imamat", shortName: "Im", number: 3, testament: "old", chaptersCount: 27 },
    { name: "Bilangan", shortName: "Bil", number: 4, testament: "old", chaptersCount: 36 },
    { name: "Ulangan", shortName: "Ul", number: 5, testament: "old", chaptersCount: 34 },
    { name: "Yosua", shortName: "Yos", number: 6, testament: "old", chaptersCount: 24 },
    { name: "Hakim-hakim", shortName: "Hak", number: 7, testament: "old", chaptersCount: 21 },
    { name: "Rut", shortName: "Rut", number: 8, testament: "old", chaptersCount: 4 },
    { name: "1 Samuel", shortName: "1Sam", number: 9, testament: "old", chaptersCount: 31 },
    { name: "2 Samuel", shortName: "2Sam", number: 10, testament: "old", chaptersCount: 24 },
    { name: "1 Raja-raja", shortName: "1Raj", number: 11, testament: "old", chaptersCount: 22 },
    { name: "2 Raja-raja", shortName: "2Raj", number: 12, testament: "old", chaptersCount: 25 },
    { name: "1 Tawarikh", shortName: "1Taw", number: 13, testament: "old", chaptersCount: 29 },
    { name: "2 Tawarikh", shortName: "2Taw", number: 14, testament: "old", chaptersCount: 36 },
    { name: "Ezra", shortName: "Ezr", number: 15, testament: "old", chaptersCount: 10 },
    { name: "Nehemia", shortName: "Neh", number: 16, testament: "old", chaptersCount: 13 },
    { name: "Ester", shortName: "Est", number: 17, testament: "old", chaptersCount: 10 },
    { name: "Ayub", shortName: "Ayb", number: 18, testament: "old", chaptersCount: 42 },
    { name: "Mazmur", shortName: "Mzm", number: 19, testament: "old", chaptersCount: 150 },
    { name: "Amsal", shortName: "Ams", number: 20, testament: "old", chaptersCount: 31 },
    { name: "Pengkhotbah", shortName: "Pkh", number: 21, testament: "old", chaptersCount: 12 },
    { name: "Kidung Agung", shortName: "Kid", number: 22, testament: "old", chaptersCount: 8 },
    { name: "Yesaya", shortName: "Yes", number: 23, testament: "old", chaptersCount: 66 },
    { name: "Yeremia", shortName: "Yer", number: 24, testament: "old", chaptersCount: 52 },
    { name: "Ratapan", shortName: "Rat", number: 25, testament: "old", chaptersCount: 5 },
    { name: "Yehezkiel", shortName: "Yeh", number: 26, testament: "old", chaptersCount: 48 },
    { name: "Daniel", shortName: "Dan", number: 27, testament: "old", chaptersCount: 12 },
    { name: "Hosea", shortName: "Hos", number: 28, testament: "old", chaptersCount: 14 },
    { name: "Yoel", shortName: "Yl", number: 29, testament: "old", chaptersCount: 3 },
    { name: "Amos", shortName: "Am", number: 30, testament: "old", chaptersCount: 9 },
    { name: "Obaja", shortName: "Ob", number: 31, testament: "old", chaptersCount: 1 },
    { name: "Yunus", shortName: "Yun", number: 32, testament: "old", chaptersCount: 4 },
    { name: "Mikha", shortName: "Mi", number: 33, testament: "old", chaptersCount: 7 },
    { name: "Nahum", shortName: "Nah", number: 34, testament: "old", chaptersCount: 3 },
    { name: "Habakuk", shortName: "Hab", number: 35, testament: "old", chaptersCount: 3 },
    { name: "Zefanya", shortName: "Zef", number: 36, testament: "old", chaptersCount: 3 },
    { name: "Hagai", shortName: "Hag", number: 37, testament: "old", chaptersCount: 2 },
    { name: "Zakharia", shortName: "Za", number: 38, testament: "old", chaptersCount: 14 },
    { name: "Maleakhi", shortName: "Mal", number: 39, testament: "old", chaptersCount: 4 },
    
    // Perjanjian Baru (New Testament) - 27 buku
    { name: "Matius", shortName: "Mat", number: 40, testament: "new", chaptersCount: 28 },
    { name: "Markus", shortName: "Mrk", number: 41, testament: "new", chaptersCount: 16 },
    { name: "Lukas", shortName: "Luk", number: 42, testament: "new", chaptersCount: 24 },
    { name: "Yohanes", shortName: "Yoh", number: 43, testament: "new", chaptersCount: 21 },
    { name: "Kisah Para Rasul", shortName: "Kis", number: 44, testament: "new", chaptersCount: 28 },
    { name: "Roma", shortName: "Rm", number: 45, testament: "new", chaptersCount: 16 },
    { name: "1 Korintus", shortName: "1Kor", number: 46, testament: "new", chaptersCount: 16 },
    { name: "2 Korintus", shortName: "2Kor", number: 47, testament: "new", chaptersCount: 13 },
    { name: "Galatia", shortName: "Gal", number: 48, testament: "new", chaptersCount: 6 },
    { name: "Efesus", shortName: "Ef", number: 49, testament: "new", chaptersCount: 6 },
    { name: "Filipi", shortName: "Flp", number: 50, testament: "new", chaptersCount: 4 },
    { name: "Kolose", shortName: "Kol", number: 51, testament: "new", chaptersCount: 4 },
    { name: "1 Tesalonika", shortName: "1Tes", number: 52, testament: "new", chaptersCount: 5 },
    { name: "2 Tesalonika", shortName: "2Tes", number: 53, testament: "new", chaptersCount: 3 },
    { name: "1 Timotius", shortName: "1Tim", number: 54, testament: "new", chaptersCount: 6 },
    { name: "2 Timotius", shortName: "2Tim", number: 55, testament: "new", chaptersCount: 4 },
    { name: "Titus", shortName: "Tit", number: 56, testament: "new", chaptersCount: 3 },
    { name: "Filemon", shortName: "Flm", number: 57, testament: "new", chaptersCount: 1 },
    { name: "Ibrani", shortName: "Ibr", number: 58, testament: "new", chaptersCount: 13 },
    { name: "Yakobus", shortName: "Yak", number: 59, testament: "new", chaptersCount: 5 },
    { name: "1 Petrus", shortName: "1Ptr", number: 60, testament: "new", chaptersCount: 5 },
    { name: "2 Petrus", shortName: "2Ptr", number: 61, testament: "new", chaptersCount: 3 },
    { name: "1 Yohanes", shortName: "1Yoh", number: 62, testament: "new", chaptersCount: 5 },
    { name: "2 Yohanes", shortName: "2Yoh", number: 63, testament: "new", chaptersCount: 1 },
    { name: "3 Yohanes", shortName: "3Yoh", number: 64, testament: "new", chaptersCount: 1 },
    { name: "Yudas", shortName: "Yud", number: 65, testament: "new", chaptersCount: 1 },
    { name: "Wahyu", shortName: "Why", number: 66, testament: "new", chaptersCount: 22 },
];

export default function ManageBibleVersion({ params }: PageProps) {
    // Unwrap params with React.use() for future compatibility with Next.js
    const unwrappedParams = React.use(params as any) as { id: string };
    const { id } = unwrappedParams;
    
    const { user } = useAuthContext() as { user: any };
    const router = useRouter();
    const [bibleVersion, setBibleVersion] = useState<BibleVersion | null>(null);
    const [bibleBooks, setBibleBooks] = useState<BibleBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [booksLoading, setBooksLoading] = useState(true);
    const [addingBooks, setAddingBooks] = useState(false);
    const [editingBook, setEditingBook] = useState(false);
    const [deletingBook, setDeletingBook] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [booksError, setBooksError] = useState<string | null>(null);
    const [newBook, setNewBook] = useState({
        name: '',
        shortName: '',
        number: 0,
        chaptersCount: 1,
        testament: 'old' as 'old' | 'new'
    });
    const [currentBook, setCurrentBook] = useState<BibleBook | null>(null);
    const [showBookForm, setShowBookForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingBibleVersion, setEditingBibleVersion] = useState(false);
    const [deletingBibleVersion, setDeletingBibleVersion] = useState(false);
    const [showBibleForm, setShowBibleForm] = useState(false);
    const [bibleFormData, setBibleFormData] = useState({
        name: '',
        shortName: '',
        language: '',
        description: ''
    });

    const languageMap: Record<string, string> = {
        id: "Indonesia",
        en: "Inggris",
        other: "Lainnya"
    };

    useEffect(() => {
        if (user == null) router.push("/signin");
    }, [user, router]);

    useEffect(() => {
        async function fetchBibleVersion() {
            setLoading(true);
            try {
                const { result, error } = await getDocument('bible', id);
                if (error) {
                    throw new Error(error.toString() || "Failed to fetch Bible version");
                }
                
                if (!result || !result.exists()) {
                    throw new Error("Bible version not found");
                }
                
                const bibleData = {
                    id: result.id,
                    ...result.data() as Omit<BibleVersion, 'id'>
                };
                
                setBibleVersion(bibleData);
                
                // Initialize form data with current values
                setBibleFormData({
                    name: bibleData.name,
                    shortName: bibleData.shortName,
                    language: bibleData.language,
                    description: bibleData.description || ''
                });
            } catch (err: any) {
                console.error("Error fetching Bible version:", err);
                setError(err.message || "Failed to load Bible version");
            } finally {
                setLoading(false);
            }
        }

        fetchBibleVersion();
    }, [id]);

    useEffect(() => {
        async function fetchBibleBooks() {
            if (!id) return;
            
            setBooksLoading(true);
            try {
                const { result, error } = await getSubCollection('bible', id, 'books');
                if (error) {
                    throw new Error(error.toString() || "Failed to fetch Bible books");
                }
                
                // Sort books by number
                const sortedBooks = result.sort((a: BibleBook, b: BibleBook) => a.number - b.number);
                setBibleBooks(sortedBooks);
            } catch (err: any) {
                console.error("Error fetching Bible books:", err);
                setBooksError(err.message || "Failed to load Bible books");
            } finally {
                setBooksLoading(false);
            }
        }

        fetchBibleBooks();
    }, [id]);

    const handleEditBook = (book: BibleBook) => {
        setCurrentBook(book);
        setNewBook({
            name: book.name,
            shortName: book.shortName,
            number: book.number,
            chaptersCount: book.chaptersCount,
            testament: book.testament
        });
        setIsEditing(true);
        setShowBookForm(true);
    };

    const handleDeleteBook = async (book: BibleBook) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus buku "${book.name}"?`)) {
            return;
        }
        
        setDeletingBook(true);
        setCurrentBook(book);
        
        try {
            const { error } = await deleteSubCollectionDoc('bible', id, 'books', book.id);
            
            if (error) {
                throw new Error(error.toString() || "Failed to delete book");
            }
            
            // Remove book from state
            setBibleBooks(prev => prev.filter(b => b.id !== book.id));
            
        } catch (err: any) {
            console.error("Error deleting book:", err);
            setBooksError(err.message || "Failed to delete book");
        } finally {
            setDeletingBook(false);
            setCurrentBook(null);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setCurrentBook(null);
        setNewBook({
            name: '',
            shortName: '',
            number: 0,
            chaptersCount: 1,
            testament: 'old'
        });
        setShowBookForm(false);
    };

    const handleAddBook = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isEditing) {
            // Handle editing existing book
            setEditingBook(true);
            
            try {
                if (!currentBook) {
                    throw new Error("No book selected for editing");
                }
                
                const bookData = {
                    ...newBook,
                    updatedAt: new Date().toISOString(),
                };
                
                const { error } = await addSubCollectionDoc('bible', id, 'books', currentBook.id, bookData);
                
                if (error) {
                    throw new Error(error.toString() || "Failed to update book");
                }
                
                // Update the book in state
                setBibleBooks(prev => 
                    prev.map(book => 
                        book.id === currentBook.id 
                            ? { 
                                ...book, 
                                ...bookData 
                              } 
                            : book
                    ).sort((a, b) => a.number - b.number)
                );
                
                // Reset form
                setNewBook({
                    name: '',
                    shortName: '',
                    number: 0,
                    chaptersCount: 1,
                    testament: 'old'
                });
                
                setIsEditing(false);
                setCurrentBook(null);
                setShowBookForm(false);
                
            } catch (err: any) {
                console.error("Error updating book:", err);
                setBooksError(err.message || "Failed to update book");
            } finally {
                setEditingBook(false);
            }
        } else {
            // Original add book functionality
            setAddingBooks(true);
            
            try {
                const bookId = uuidv4();
                const bookData = {
                    ...newBook,
                    id: bookId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: user.uid
                };
                
                const { error } = await addSubCollectionDoc('bible', id, 'books', bookId, bookData);
                
                if (error) {
                    throw new Error(error.toString() || "Failed to add book");
                }
                
                // Add the new book to the state
                setBibleBooks(prev => [...prev, bookData as BibleBook].sort((a, b) => a.number - b.number));
                
                // Reset form
                setNewBook({
                    name: '',
                    shortName: '',
                    number: 0,
                    chaptersCount: 1,
                    testament: 'old'
                });
                
                setShowBookForm(false);
                
            } catch (err: any) {
                console.error("Error adding book:", err);
                setBooksError(err.message || "Failed to add book");
            } finally {
                setAddingBooks(false);
            }
        }
    };

    const handleAddDefaultBooks = async () => {
        if (!confirm("Apakah Anda yakin ingin menambahkan daftar buku standar? Ini akan menambahkan 66 buku umum dalam Alkitab.")) {
            return;
        }
        
        setAddingBooks(true);
        
        try {
            for (const book of defaultBooks) {
                const bookId = uuidv4();
                const bookData = {
                    ...book,
                    id: bookId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: user.uid
                };
                
                await addSubCollectionDoc('bible', id, 'books', bookId, bookData);
            }
            
            // Refetch books
            const { result, error } = await getSubCollection('bible', id, 'books');
            if (error) {
                throw new Error(error.toString() || "Failed to fetch Bible books after adding defaults");
            }
            
            // Sort books by number
            const sortedBooks = result.sort((a: BibleBook, b: BibleBook) => a.number - b.number);
            setBibleBooks(sortedBooks);
            
        } catch (err: any) {
            console.error("Error adding default books:", err);
            setBooksError(err.message || "Failed to add default books");
        } finally {
            setAddingBooks(false);
        }
    };

    const handleEditBibleVersion = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditingBibleVersion(true);
        
        try {
            const bibleData = {
                ...bibleFormData,
                updatedAt: new Date().toISOString(),
            };
            
            const { error } = await addData('bible', id, bibleData);
            
            if (error) {
                throw new Error(error.toString() || "Failed to update Bible version");
            }
            
            // Update the Bible version in state
            setBibleVersion(prev => prev ? {
                ...prev,
                ...bibleData
            } : null);
            
            // Reset form
            setShowBibleForm(false);
            
        } catch (err: any) {
            console.error("Error updating Bible version:", err);
            setError(err.message || "Failed to update Bible version");
        } finally {
            setEditingBibleVersion(false);
        }
    };

    const handleDeleteBibleVersion = async () => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus versi Bible ini? Tindakan ini tidak dapat dibatalkan.")) {
            return;
        }
        
        setDeletingBibleVersion(true);
        
        try {
            const { error } = await deleteDocument('bible', id);
            
            if (error) {
                throw new Error(error.toString() || "Failed to delete Bible version");
            }
            
            // Redirect back to Bible versions list
            router.push('/admin/manage-bible');
            
        } catch (err: any) {
            console.error("Error deleting Bible version:", err);
            setError(err.message || "Failed to delete Bible version");
        } finally {
            setDeletingBibleVersion(false);
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
                <h1 className="text-3xl font-bold">Kelola Bible</h1>
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
            ) : bibleVersion ? (
                <div className="grid gap-6">
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Informasi Versi Bible</h2>
                            
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Nama</span>
                                    </label>
                                    <div className="text-lg">{bibleVersion.name}</div>
                                </div>
                                
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Kode</span>
                                    </label>
                                    <div className="text-lg">{bibleVersion.shortName}</div>
                                </div>
                                
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Bahasa</span>
                                    </label>
                                    <div className="text-lg">{languageMap[bibleVersion.language] || bibleVersion.language}</div>
                                </div>
                                
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Tanggal Dibuat</span>
                                    </label>
                                    <div className="text-lg">
                                        {new Date(bibleVersion.createdAt).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="form-control mt-2">
                                <label className="label">
                                    <span className="label-text font-bold">Deskripsi</span>
                                </label>
                                <div className="text-lg">{bibleVersion.description || "-"}</div>
                            </div>
                            
                            <div className="card-actions justify-end mt-6">
                                <button 
                                    className={`btn btn-primary ${editingBibleVersion ? 'loading' : ''}`}
                                    onClick={() => setShowBibleForm(!showBibleForm)}
                                    disabled={editingBibleVersion || deletingBibleVersion}
                                >
                                    {showBibleForm ? 'Batal Edit' : 'Edit Informasi'}
                                </button>
                                <button 
                                    className={`btn btn-error ${deletingBibleVersion ? 'loading' : ''}`}
                                    onClick={handleDeleteBibleVersion}
                                    disabled={editingBibleVersion || deletingBibleVersion}
                                >
                                    Hapus Versi Bible
                                </button>
                            </div>
                        </div>
                    </div>

                    {showBibleForm && (
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h3 className="card-title">Edit Informasi Bible</h3>
                                <form onSubmit={handleEditBibleVersion}>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Nama</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                className="input input-bordered" 
                                                value={bibleFormData.name}
                                                onChange={(e) => setBibleFormData({...bibleFormData, name: e.target.value})}
                                                required
                                            />
                                        </div>
                                        
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Kode</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                className="input input-bordered" 
                                                value={bibleFormData.shortName}
                                                onChange={(e) => setBibleFormData({...bibleFormData, shortName: e.target.value})}
                                                required
                                            />
                                        </div>
                                        
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Bahasa</span>
                                            </label>
                                            <select 
                                                className="select select-bordered" 
                                                value={bibleFormData.language}
                                                onChange={(e) => setBibleFormData({...bibleFormData, language: e.target.value})}
                                                required
                                            >
                                                <option value="id">Indonesia</option>
                                                <option value="en">Inggris</option>
                                                <option value="other">Lainnya</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="form-control mt-4">
                                        <label className="label">
                                            <span className="label-text">Deskripsi</span>
                                        </label>
                                        <textarea 
                                            className="textarea textarea-bordered h-24" 
                                            value={bibleFormData.description}
                                            onChange={(e) => setBibleFormData({...bibleFormData, description: e.target.value})}
                                        />
                                    </div>
                                    
                                    <div className="card-actions justify-end mt-4">
                                        <button 
                                            type="button"
                                            className="btn btn-ghost"
                                            onClick={() => setShowBibleForm(false)}
                                            disabled={editingBibleVersion}
                                        >
                                            Batal
                                        </button>
                                        <button 
                                            type="submit" 
                                            className={`btn btn-primary ${editingBibleVersion ? 'loading' : ''}`}
                                            disabled={editingBibleVersion}
                                        >
                                            Simpan Perubahan
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                    
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Kelola Buku Bible</h2>
                            
                            {booksError && (
                                <div className="alert alert-error mt-4 mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{booksError}</span>
                                </div>
                            )}
                            
                            {booksLoading ? (
                                <div className="flex justify-center py-4">
                                    <span className="loading loading-spinner loading-md"></span>
                                </div>
                            ) : (
                                <>
                                    <div className="card-actions justify-between items-center mt-2 mb-4">
                                        <div>
                                            <span className="font-bold">Total Buku: </span>
                                            <span className="badge badge-lg">{bibleBooks.length}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {bibleBooks.length === 0 && (
                                                <button 
                                                    className={`btn btn-primary ${addingBooks ? 'loading' : ''}`}
                                                    onClick={handleAddDefaultBooks}
                                                    disabled={addingBooks || editingBook || deletingBook}
                                                >
                                                    Tambah Daftar Buku Standar
                                                </button>
                                            )}
                                            <button 
                                                className="btn btn-primary"
                                                onClick={() => {
                                                    if (showBookForm && isEditing) {
                                                        handleCancelEdit();
                                                    } else {
                                                        setShowBookForm(!showBookForm);
                                                    }
                                                }}
                                                disabled={addingBooks || editingBook || deletingBook}
                                            >
                                                {showBookForm ? (isEditing ? 'Batal Edit' : 'Batal') : 'Tambah Buku'}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {showBookForm && (
                                        <div className="bg-base-200 p-4 rounded-lg mb-4">
                                            <h3 className="font-bold text-lg mb-4">
                                                {isEditing ? 'Edit Buku' : 'Tambah Buku Baru'}
                                            </h3>
                                            <form onSubmit={handleAddBook}>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div className="form-control">
                                                        <label className="label">
                                                            <span className="label-text">Nama Buku</span>
                                                        </label>
                                                        <input 
                                                            type="text" 
                                                            className="input input-bordered" 
                                                            value={newBook.name}
                                                            onChange={(e) => setNewBook({...newBook, name: e.target.value})}
                                                            required
                                                        />
                                                    </div>
                                                    
                                                    <div className="form-control">
                                                        <label className="label">
                                                            <span className="label-text">Kode Buku</span>
                                                        </label>
                                                        <input 
                                                            type="text" 
                                                            className="input input-bordered" 
                                                            value={newBook.shortName}
                                                            onChange={(e) => setNewBook({...newBook, shortName: e.target.value})}
                                                            required
                                                        />
                                                    </div>
                                                    
                                                    <div className="form-control">
                                                        <label className="label">
                                                            <span className="label-text">Nomor Urut</span>
                                                        </label>
                                                        <input 
                                                            type="number" 
                                                            className="input input-bordered" 
                                                            value={newBook.number || ''}
                                                            onChange={(e) => setNewBook({...newBook, number: parseInt(e.target.value)})}
                                                            required
                                                            disabled={isEditing}
                                                        />
                                                    </div>
                                                    
                                                    <div className="form-control">
                                                        <label className="label">
                                                            <span className="label-text">Jumlah Pasal</span>
                                                        </label>
                                                        <input 
                                                            type="number" 
                                                            className="input input-bordered" 
                                                            value={newBook.chaptersCount || 1}
                                                            min={1}
                                                            onChange={(e) => setNewBook({...newBook, chaptersCount: parseInt(e.target.value)})}
                                                            required
                                                        />
                                                    </div>
                                                    
                                                    <div className="form-control">
                                                        <label className="label">
                                                            <span className="label-text">Perjanjian</span>
                                                        </label>
                                                        <select 
                                                            className="select select-bordered" 
                                                            value={newBook.testament}
                                                            onChange={(e) => setNewBook({...newBook, testament: e.target.value as 'old' | 'new'})}
                                                            required
                                                        >
                                                            <option value="old">Perjanjian Lama</option>
                                                            <option value="new">Perjanjian Baru</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-4 flex justify-end gap-2">
                                                    <button 
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={handleCancelEdit}
                                                        disabled={addingBooks || editingBook}
                                                    >
                                                        Batal
                                                    </button>
                                                    <button 
                                                        type="submit" 
                                                        className={`btn btn-primary ${(addingBooks || editingBook) ? 'loading' : ''}`}
                                                        disabled={addingBooks || editingBook}
                                                    >
                                                        {isEditing ? 'Simpan Perubahan' : 'Simpan Buku'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                    
                                    {bibleBooks.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="table table-zebra">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Nama</th>
                                                        <th>Kode</th>
                                                        <th>Perjanjian</th>
                                                        <th>Jumlah Pasal</th>
                                                        <th>Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {bibleBooks.map((book) => (
                                                        <tr key={book.id}>
                                                            <td>{book.number}</td>
                                                            <td>{book.name}</td>
                                                            <td>{book.shortName}</td>
                                                            <td>
                                                                <span className={`badge ${book.testament === 'old' ? 'badge-primary' : 'badge-secondary'}`}>
                                                                    {book.testament === 'old' ? 'Perjanjian Lama' : 'Perjanjian Baru'}
                                                                </span>
                                                            </td>
                                                            <td>{book.chaptersCount}</td>
                                                            <td>
                                                                <button 
                                                                    className="btn btn-sm btn-primary mr-2"
                                                                    onClick={() => handleEditBook(book)}
                                                                    disabled={addingBooks || editingBook || deletingBook}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button 
                                                                    className={`btn btn-sm btn-error mr-2 ${deletingBook && currentBook?.id === book.id ? 'loading' : ''}`}
                                                                    onClick={() => handleDeleteBook(book)}
                                                                    disabled={addingBooks || editingBook || deletingBook}
                                                                >
                                                                    Hapus
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-accent"
                                                                    onClick={() => router.push(`/admin/manage-bible/${id}/books/${book.id}`)}
                                                                    disabled={addingBooks || editingBook || deletingBook}
                                                                >
                                                                    Kelola Pasal
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
                                            <span>Belum ada buku untuk versi Bible ini. Tambahkan buku atau gunakan daftar standar.</span>
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