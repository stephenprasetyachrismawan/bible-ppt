'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Define types for Bible data structure
type VerseContent = string;
type VerseMap = Record<string, VerseContent>;
type ChapterMap = Record<string, VerseMap>;
type BibleData = Record<string, ChapterMap>;

// Import Firestore utilities
import getAllDocuments from '@/firebase/firestore/getAllData';
import getSubCollection from '@/firebase/firestore/getSubCollection';
import getDocument from '@/firebase/firestore/getData';
import documentExists from '@/firebase/firestore/documentExists';
import testFirestoreConnection from '@/firebase/firestore/testConnection';
import addData from '@/firebase/firestore/addData';


export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [bibleVersions, setBibleVersions] = useState<Array<{id: string, name: string, shortName?: string}>>([]);
  
  // State for books, chapters, and verses
  const [books, setBooks] = useState<Array<{id: string, name: string, number: number}>>([]);
  const [startChapters, setStartChapters] = useState<Array<{id: string, number: number}>>([]);
  const [startVerses, setStartVerses] = useState<Array<{id: string, number: number, text?: string}>>([]);
  const [endChapters, setEndChapters] = useState<Array<{id: string, number: number}>>([]);
  const [endVerses, setEndVerses] = useState<Array<{id: string, number: number, text?: string}>>([]);
  
  // Selection state
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedStartChapter, setSelectedStartChapter] = useState('');
  const [selectedStartVerse, setSelectedStartVerse] = useState('');
  const [selectedEndChapter, setSelectedEndChapter] = useState('');
  const [selectedEndVerse, setSelectedEndVerse] = useState('');
  const [useEndVerse, setUseEndVerse] = useState(false);
  
  // Define the type for search results
  type SearchResultType = {
    book: string;
    chapter: string;
    verses: Record<string, string>;
    versesOrder?: string[];
    type: 'chapter' | 'single' | 'range';
    verse?: string;
    startVerse?: string;
    endVerse?: string;
    highlightStart?: string;
    highlightEnd?: string;
    versionId: string;
  };
  
  const [searchResults, setSearchResults] = useState<SearchResultType | null>(null);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<{success?: boolean, message?: string, details?: any}>({});
  const [selectedVersion, setSelectedVersion] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Fetch Bible versions on component mount
  useEffect(() => {
    async function fetchBibleVersions() {
      const { result, error } = await getAllDocuments('bible');
      if (error) {
        console.error('Error fetching Bible versions:', error);
        setError('Terjadi kesalahan saat memuat versi Alkitab. Silakan coba beberapa saat lagi.');
        return;
      }
      
      if (result && result.length > 0) {
        setBibleVersions(result.map((version: any) => ({
          id: version.id,
          name: version.name,
          shortName: version.shortName
        })));
        
        // Set default selected version to first available version
        setSelectedVersion(result[0].id);
      } else {
        // No Bible versions available
        setError('Tidak ada versi Alkitab yang tersedia saat ini. Silakan coba beberapa saat lagi.');
      }
    }
    
    fetchBibleVersions();
  }, []);
  
  // Fetch books when Bible version changes
  useEffect(() => {
    async function fetchBooks() {
      if (!selectedVersion) {
        setBooks([]);
        return;
      }
      
      try {
        const { result, error } = await getSubCollection('bible', selectedVersion, 'books');
        
        if (error) {
          console.error('Error fetching books:', error);
          setError(`Error mengambil data kitab: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
        
        if (result && result.length > 0) {
          // Sort books by number
          const sortedBooks = result.sort((a, b) => a.number - b.number);
          setBooks(sortedBooks);
        } else {
          setBooks([]);
          setError('Tidak ada kitab yang tersedia untuk versi Alkitab ini.');
        }
      } catch (err) {
        console.error('Error in fetchBooks:', err);
        setError('Terjadi kesalahan saat memuat kitab.');
      }
    }
    
    fetchBooks();
  }, [selectedVersion]);
  
  // Fetch start chapters when book changes
  useEffect(() => {
    async function fetchStartChapters() {
      if (!selectedVersion || !selectedBook) {
        setStartChapters([]);
        return;
      }
      
      try {
        const { result, error } = await getSubCollection(
          'bible', selectedVersion, 'books', selectedBook, 'chapters'
        );
        
        if (error) {
          console.error('Error fetching chapters:', error);
          setError(`Error mengambil data pasal: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
        
        if (result && result.length > 0) {
          // Sort chapters by number
          const sortedChapters = result.sort((a, b) => a.number - b.number);
          setStartChapters(sortedChapters);
          
          // Reset chapter and verse selections
          setSelectedStartChapter('');
          setSelectedStartVerse('');
          setStartVerses([]);
          setSelectedEndChapter('');
          setSelectedEndVerse('');
          setEndVerses([]);
        } else {
          setStartChapters([]);
          setError('Tidak ada pasal yang tersedia untuk kitab ini.');
        }
      } catch (err) {
        console.error('Error in fetchStartChapters:', err);
        setError('Terjadi kesalahan saat memuat pasal.');
      }
    }
    
    fetchStartChapters();
  }, [selectedVersion, selectedBook]);
  
  // Fetch end chapters (same as start but only when useEndVerse is true)
  useEffect(() => {
    if (!useEndVerse) {
      setEndChapters([]);
      setSelectedEndChapter('');
      setSelectedEndVerse('');
      return;
    }
    
    // If using end verse, copy start chapters to end chapters
    setEndChapters(startChapters);
  }, [startChapters, useEndVerse]);
  
  // Fetch start verses when start chapter changes
  useEffect(() => {
    async function fetchStartVerses() {
      if (!selectedVersion || !selectedBook || !selectedStartChapter) {
        setStartVerses([]);
        return;
      }
      
      try {
        const { result, error } = await getSubCollection(
          'bible', selectedVersion, 'books', selectedBook, 'chapters', selectedStartChapter, 'verses'
        );
        
        if (error) {
          console.error('Error fetching verses:', error);
          setError(`Error mengambil data ayat: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
        
        if (result && result.length > 0) {
          // Sort verses by urutan if available, or number as fallback
          const sortedVerses = result.sort((a, b) => {
            if (a.urutan && b.urutan) return a.urutan - b.urutan;
            return (a.number || 0) - (b.number || 0);
          });
          setStartVerses(sortedVerses);
          
          // Reset verse selection
          setSelectedStartVerse('');
          setSelectedEndVerse('');
          setEndVerses([]);
        } else {
          setStartVerses([]);
          setError('Tidak ada ayat yang tersedia untuk pasal ini.');
        }
      } catch (err) {
        console.error('Error in fetchStartVerses:', err);
        setError('Terjadi kesalahan saat memuat ayat.');
      }
    }
    
    fetchStartVerses();
  }, [selectedVersion, selectedBook, selectedStartChapter]);
  
  // Fetch end verses when end chapter changes
  useEffect(() => {
    async function fetchEndVerses() {
      if (!useEndVerse || !selectedVersion || !selectedBook || !selectedEndChapter) {
        setEndVerses([]);
        return;
      }
      
      try {
        const { result, error } = await getSubCollection(
          'bible', selectedVersion, 'books', selectedBook, 'chapters', selectedEndChapter, 'verses'
        );
        
        if (error) {
          console.error('Error fetching end verses:', error);
          setError(`Error mengambil data ayat akhir: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
        
        if (result && result.length > 0) {
          // Sort verses by urutan if available, or number as fallback
          const sortedVerses = result.sort((a, b) => {
            if (a.urutan && b.urutan) return a.urutan - b.urutan;
            return (a.number || 0) - (b.number || 0);
          });
          setEndVerses(sortedVerses);
          
          // Reset end verse selection
          setSelectedEndVerse('');
        } else {
          setEndVerses([]);
          setError('Tidak ada ayat yang tersedia untuk pasal akhir ini.');
        }
      } catch (err) {
        console.error('Error in fetchEndVerses:', err);
        setError('Terjadi kesalahan saat memuat ayat akhir.');
      }
    }
    
    fetchEndVerses();
  }, [selectedVersion, selectedBook, selectedEndChapter, useEndVerse]);
  
  // Handle end chapter selection to ensure it's after or equal to start chapter
  useEffect(() => {
    if (!useEndVerse || !selectedStartChapter || !endChapters.length) return;
    
    const startChapterNum = startChapters.find(c => c.id === selectedStartChapter)?.number || 0;
    
    // Filter end chapters to only include those >= start chapter
    const validEndChapters = endChapters.filter(c => c.number >= startChapterNum);
    
    if (validEndChapters.length > 0) {
      // If current selection is no longer valid, select the first valid option
      const currentEndChapterNum = endChapters.find(c => c.id === selectedEndChapter)?.number || 0;
      
      if (currentEndChapterNum < startChapterNum) {
        setSelectedEndChapter(validEndChapters[0].id);
      }
    }
  }, [selectedStartChapter, endChapters, useEndVerse]);
  
  // Handle end verse selection to ensure it's after or equal to start verse when in same chapter
  useEffect(() => {
    if (!useEndVerse || !selectedStartVerse || !selectedEndChapter || !endVerses.length) return;
    
    // Only apply this logic if start and end chapters are the same
    if (selectedStartChapter === selectedEndChapter) {
      const startVerseNum = startVerses.find(v => v.id === selectedStartVerse)?.number || 0;
      
      // Filter end verses to only include those >= start verse
      const validEndVerses = endVerses.filter(v => v.number >= startVerseNum);
      
      if (validEndVerses.length > 0) {
        // If current selection is no longer valid, select the first valid option
        const currentEndVerseNum = endVerses.find(v => v.id === selectedEndVerse)?.number || 0;
        
        if (currentEndVerseNum < startVerseNum) {
          setSelectedEndVerse(validEndVerses[0].id);
        }
      }
    }
  }, [selectedStartVerse, selectedEndChapter, endVerses, startVerses, selectedStartChapter, useEndVerse]);
  
  // Handle dropdown changes
  const handleBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBook(e.target.value);
  };
  
  const handleStartChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStartChapter(e.target.value);
  };
  
  const handleStartVerseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStartVerse(e.target.value);
  };
  
  const handleEndChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEndChapter(e.target.value);
  };
  
  const handleEndVerseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEndVerse(e.target.value);
  };
  
  const handleUseEndVerseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUseEndVerse(e.target.checked);
  };
  
  // New search function based on dropdowns
  const handleDropdownSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVersion || !selectedBook || !selectedStartChapter || !selectedStartVerse) {
      setError('Pilih kitab, pasal, dan ayat terlebih dahulu.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSearchResults(null);
    
    try {
      // Find book, chapter, and verse objects
      const book = books.find(b => b.id === selectedBook);
      const startChapter = startChapters.find(c => c.id === selectedStartChapter);
      const startVerse = startVerses.find(v => v.id === selectedStartVerse);
      
      if (!book || !startChapter || !startVerse) {
        setError('Data ayat tidak ditemukan. Silakan coba pilihan lain.');
        setLoading(false);
        return;
      }
      
      // Always show all content in the chapter, including section titles
      // Get all content in the chapter, in the correct order
      const allChapterContent = [...startVerses];
      
      // Sort all content by urutan to ensure correct order
      allChapterContent.sort((a, b) => {
        const aUrutan = a.urutan !== undefined ? a.urutan : a.number;
        const bUrutan = b.urutan !== undefined ? b.urutan : b.number;
        return aUrutan - bUrutan;
      });
      
      // Create structured array with order info
      const allOrderedContent = allChapterContent.map((item, index) => {
        return {
          order: index,
          id: item.id,
          number: item.number,
          text: item.text || '',
          type: item.type || 'verse',
          urutan: item.urutan !== undefined ? item.urutan : item.number
        };
      });
      
      // Create verses map but keep track of the exact order
      const versesMap: Record<string, string> = {};
      const versesOrder: string[] = [];
      
      // Check if using end verse for range search
      if (useEndVerse && selectedEndChapter && selectedEndVerse) {
        const endChapter = endChapters.find(c => c.id === selectedEndChapter);
        const endVerse = endVerses.find(v => v.id === selectedEndVerse);
        
        if (!endChapter || !endVerse) {
          setError('Data ayat akhir tidak ditemukan. Silakan coba pilihan lain.');
          setLoading(false);
          return;
        }
        
        // Validate verse range
        const startChapterNum = startChapter.number;
        const endChapterNum = endChapter.number;
        
        if (startChapterNum !== endChapterNum) {
          // Multi-chapter range (more complex - we need to fetch all verses from all chapters)
          setError('Maaf, rentang ayat antar pasal belum didukung pada versi ini.');
          setLoading(false);
          return;
        }
        
        // Find the selected verses from the ordered content
        const startVerseObj = allOrderedContent.find(item => item.id === selectedStartVerse);
        const endVerseObj = allOrderedContent.find(item => item.id === selectedEndVerse);
        
        if (!startVerseObj || !endVerseObj) {
          setError('Data ayat tidak ditemukan.');
          setLoading(false);
          return;
        }
        
        // Create verses map for all content in the chapter
        allOrderedContent.forEach(item => {
          let key;
          if (item.type === 'title') {
            key = `title-${item.id}`;
          } else {
            key = item.number.toString();
          }
          versesMap[key] = item.text;
          versesOrder.push(key);
        });
        
        setSearchResults({
          book: book.name,
          chapter: startChapter.number.toString(),
          verses: versesMap,
          versesOrder: versesOrder,
          type: 'range',
          startVerse: startVerse.number.toString(),
          endVerse: endVerse.number.toString(),
          highlightStart: startVerseObj.number?.toString() || '',
          highlightEnd: endVerseObj.number?.toString() || '',
          versionId: selectedVersion
        });
      } else {
        // Single verse search - still show all content for context
        const selectedVerseObj = allOrderedContent.find(item => item.id === selectedStartVerse);
        
        if (!selectedVerseObj) {
          setError('Data ayat tidak ditemukan.');
          setLoading(false);
          return;
        }
        
        // Create verses map for all content in the chapter
        allOrderedContent.forEach(item => {
          let key;
          if (item.type === 'title') {
            key = `title-${item.id}`;
          } else {
            key = item.number.toString();
          }
          versesMap[key] = item.text;
          versesOrder.push(key);
        });
        
        setSearchResults({
          book: book.name,
          chapter: startChapter.number.toString(),
          verses: versesMap,
          versesOrder: versesOrder,
          type: 'single',
          verse: startVerse.number.toString(),
          highlightStart: startVerse.number.toString(),
          highlightEnd: startVerse.number.toString(),
          versionId: selectedVersion
        });
      }
    } catch (err) {
      console.error('Error during dropdown search:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
      setError('Terjadi kesalahan saat mencari ayat. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };
  
  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus({});
    
    try {
      const result = await testFirestoreConnection();
      if (result.success) {
        setConnectionStatus({
          success: true,
          message: 'Koneksi Firebase berhasil!',
          details: result
        });
      } else {
        setConnectionStatus({
          success: false,
          message: 'Koneksi Firebase gagal.',
          details: result
        });
      }
    } catch (err) {
      console.error('Error testing Firebase connection:', err);
      setConnectionStatus({
        success: false,
        message: 'Terjadi kesalahan saat menguji koneksi Firebase.',
        details: err
      });
    } finally {
      setTestingConnection(false);
    }
  };
  
  const [creatingDefaultVersion, setCreatingDefaultVersion] = useState(false);
  
  const createDefaultBibleVersion = async () => {
    setCreatingDefaultVersion(true);
    setError('');
    
    try {
      // Create a default Indonesian Bible version
      const defaultVersion = {
        id: 'tb',
        name: 'Terjemahan Baru Versi 1',
        shortName: 'TB',
        language: 'id',
        description: 'Versi default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add to Firestore
      const { error } = await addData('bible', 'tb', defaultVersion);
      
      if (error) {
        throw new Error(`Error creating default Bible version: ${error}`);
      }
      
      // Reload Bible versions
      const { result, error: loadError } = await getAllDocuments('bible');
      
      if (loadError) {
        throw new Error(`Error loading Bible versions after creation: ${loadError}`);
      }
      
      if (result && result.length > 0) {
        setBibleVersions(result.map((version: any) => ({
          id: version.id,
          name: version.name,
          shortName: version.shortName
        })));
        
        setSelectedVersion('tb');
      }
      
      setConnectionStatus({
        success: true,
        message: 'Versi Alkitab dasar berhasil dibuat!',
        details: { config: { projectId: 'bible-created' } }
      });
      
    } catch (err) {
      console.error('Error creating default Bible version:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan saat membuat versi Alkitab dasar.');
      }
    } finally {
      setCreatingDefaultVersion(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-primary text-primary-content shadow-md">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Bible PPT Generator</h1>
            <p className="text-sm opacity-90">Pencarian Ayat Alkitab</p>
          </div>
          <div className="flex gap-2">
            <Link href="/signin" className="btn btn-sm btn-ghost">Masuk</Link>
            <Link href="/signup" className="btn btn-sm btn-outline">Daftar</Link>
          </div>
        </div>
      </header>

      {/* Search Section with Dropdowns */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">Cari Ayat Alkitab</h2>
            
            {/* Bible Version Dropdown - keep existing */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Pilih Versi Alkitab</span>
              </label>
              <select 
                className="select select-bordered w-full" 
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
              >
                {bibleVersions.length > 0 ? (
                  bibleVersions.map(version => (
                    <option key={version.id} value={version.id}>{version.name}</option>
                  ))
                ) : (
                  <option value="">Tidak ada versi Alkitab tersedia</option>
                )}
              </select>
            </div>
            
            {/* New Dropdown-based Search Form */}
            <form onSubmit={handleDropdownSearch} className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Verse Section */}
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-700">Ayat Awal</h3>
                  
                  {/* Book Dropdown */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Kitab</span>
                    </label>
                    <select 
                      className="select select-bordered w-full" 
                      value={selectedBook}
                      onChange={handleBookChange}
                      disabled={!selectedVersion || loading}
                    >
                      <option value="">Pilih Kitab</option>
                      {books.map(book => (
                        <option key={book.id} value={book.id}>{book.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Start Chapter Dropdown */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Pasal</span>
                    </label>
                    <select 
                      className="select select-bordered w-full" 
                      value={selectedStartChapter}
                      onChange={handleStartChapterChange}
                      disabled={!selectedBook || loading}
                    >
                      <option value="">Pilih Pasal</option>
                      {startChapters.map(chapter => (
                        <option key={chapter.id} value={chapter.id}>{chapter.number}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Start Verse Dropdown */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Ayat</span>
                    </label>
                    <select 
                      className="select select-bordered w-full" 
                      value={selectedStartVerse}
                      onChange={handleStartVerseChange}
                      disabled={!selectedStartChapter || loading}
                    >
                      <option value="">Pilih Ayat</option>
                      {startVerses
                        .filter(verse => verse.type !== 'title') // Only show actual verses, not section titles
                        .map(verse => (
                          <option key={verse.id} value={verse.id}>{verse.number}</option>
                        ))}
                    </select>
                  </div>
                </div>
                
                {/* End Verse Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-700">Ayat Akhir (Opsional)</h3>
                    <div className="form-control">
                      <label className="label cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="checkbox checkbox-primary" 
                          checked={useEndVerse}
                          onChange={handleUseEndVerseChange}
                          disabled={!selectedStartVerse || loading}
                        />
                        <span className="label-text ml-2">Gunakan rentang ayat</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* End Chapter Dropdown */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Pasal</span>
                    </label>
                    <select 
                      className="select select-bordered w-full" 
                      value={selectedEndChapter}
                      onChange={handleEndChapterChange}
                      disabled={!useEndVerse || !selectedStartVerse || loading}
                    >
                      <option value="">Pilih Pasal</option>
                      {endChapters.map(chapter => (
                        <option key={chapter.id} value={chapter.id}>{chapter.number}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* End Verse Dropdown */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Ayat</span>
                    </label>
                    <select 
                      className="select select-bordered w-full" 
                      value={selectedEndVerse}
                      onChange={handleEndVerseChange}
                      disabled={!useEndVerse || !selectedEndChapter || loading}
                    >
                      <option value="">Pilih Ayat</option>
                      {endVerses
                        .filter(verse => verse.type !== 'title') // Only show actual verses, not section titles
                        .map(verse => (
                          <option key={verse.id} value={verse.id}>{verse.number}</option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Search Button */}
              <div className="mt-4">
                <button 
                  type="submit" 
                  className="btn btn-primary w-full" 
                  disabled={!selectedStartVerse || loading || (useEndVerse && !selectedEndVerse)}
                >
                  {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Cari Ayat'}
                </button>
              </div>
            </form>
            
            {/* Keep existing error display */}
            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
                {bibleVersions.length === 0 && (
                  <div className="mt-2 flex gap-2">
                    <button 
                      className="btn btn-xs btn-outline" 
                      onClick={testConnection}
                      disabled={testingConnection}
                    >
                      {testingConnection ? 'Menguji koneksi...' : 'Uji Koneksi Firebase'}
                    </button>
                    
                    <button 
                      className="btn btn-xs btn-outline btn-accent" 
                      onClick={createDefaultBibleVersion}
                      disabled={creatingDefaultVersion}
                    >
                      {creatingDefaultVersion ? 'Membuat...' : 'Buat Versi Alkitab Dasar'}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Keep existing connection status display */}
            {connectionStatus.message && (
              <div className={`alert ${connectionStatus.success ? 'alert-success' : 'alert-warning'} mb-4`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  {connectionStatus.success ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  )}
                </svg>
                <div>
                  <h3 className="font-bold">{connectionStatus.message}</h3>
                  {connectionStatus.details && (
                    <div className="text-xs mt-1">
                      <p>Project ID: {connectionStatus.details.config?.projectId || 'N/A'}</p>
                      {connectionStatus.details.collections && connectionStatus.details.collections.map((col: any, index: number) => (
                        <p key={index}>Collection {col.name}: {col.exists ? 'Exists' : 'Does not exist'} ({col.count} documents)</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Keep existing search results display */}
            {searchResults && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-2">
                  {searchResults.book} {searchResults.chapter}
                  {searchResults.type === 'single' && `:${searchResults.verse}`}
                  {searchResults.type === 'range' && `:${searchResults.startVerse}-${searchResults.endVerse}`}
                </h3>
                
                <div className="bg-base-200 p-4 rounded-lg">
                  {searchResults.versesOrder ? (
                    // Use versesOrder to maintain exact ordering from Firestore
                    searchResults.versesOrder.map(key => {
                      const text = searchResults.verses[key];
                      // Check if this is a section title (key starts with 'title-')
                      const isTitle = key.startsWith('title-');
                      
                      // Determine if this verse should be highlighted
                      const isHighlighted = !isTitle && 
                        parseInt(key) >= parseInt(searchResults.highlightStart || '0') && 
                        parseInt(key) <= parseInt(searchResults.highlightEnd || '0');
                      
                      return (
                        <div 
                          key={key} 
                          className={`mb-2 last:mb-0 ${isTitle ? 'font-bold text-purple-600 mt-4 mb-3' : ''} ${isHighlighted ? 'bg-yellow-100 p-1 rounded' : ''}`}
                        >
                          {!isTitle && <span className="font-bold mr-2">{key}</span>}
                          <span dangerouslySetInnerHTML={{ __html: text }} />
                        </div>
                      );
                    })
                  ) : (
                    // Fallback to old behavior
                    Object.entries(searchResults.verses).map(([verseNum, text]) => {
                      // Check if this is a section title
                      const isTitle = verseNum.startsWith('title-');
                      
                      return (
                        <div key={verseNum} className={`mb-2 last:mb-0 ${isTitle ? 'font-bold text-purple-600 mt-4 mb-3' : ''}`}>
                          {!isTitle && <span className="font-bold mr-2">{verseNum}</span>}
                          <span dangerouslySetInnerHTML={{ __html: text }} />
                        </div>
                      );
                    })
                  )}
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Link href="/signin" className="btn btn-primary btn-sm">
                    Buat Presentasi dari Ayat Ini
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer footer-center p-6 bg-primary text-primary-content mt-auto">
        <div>
          <p className="font-bold">Bible PPT Generator</p>
          <p>© {new Date().getFullYear()} - Semua Hak Dilindungi</p>
        </div>
      </footer>
    </div>
  );
}
