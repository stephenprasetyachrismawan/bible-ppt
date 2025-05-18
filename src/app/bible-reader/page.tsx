'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import getAllDocuments from '@/firebase/firestore/getAllData';
import getSubCollection from '@/firebase/firestore/getSubCollection';
import getDocument from '@/firebase/firestore/getData';

/**
 * Interface untuk data ayat
 */
interface Verse {
  id: string;
  number: number;
  text?: string;
  type?: 'verse' | 'title';
  urutan?: number;
}

/**
 * Halaman Pembaca Alkitab
 * Memungkinkan pengguna untuk mencari dan membaca ayat Alkitab dengan berbagai filter
 */
export default function BibleReader() {
  // State untuk versi Alkitab
  const [bibleVersions, setBibleVersions] = useState<Array<{ id: string; name: string; shortName?: string }>>([]);
  const [selectedVersion, setSelectedVersion] = useState('');
  
  // State untuk kitab, pasal, dan ayat
  const [books, setBooks] = useState<Array<{ id: string; name: string; number: number }>>([]);
  const [chapters, setChapters] = useState<Array<{ id: string; number: number }>>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  
  // State untuk pemilihan
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedVerse, setSelectedVerse] = useState('');
  const [showFullChapter, setShowFullChapter] = useState(true);
  
  // State untuk loading dan error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State untuk hasil pencarian
  const [chapterContent, setChapterContent] = useState<Verse[]>([]);
  const [chapterInfo, setChapterInfo] = useState<{ book: string; chapter: number; totalVerses: number } | null>(null);
  
  /**
   * Mengambil data versi Alkitab saat komponen dimuat
   */
  useEffect(() => {
    async function fetchBibleVersions() {
      setLoading(true);
      const { result, error } = await getAllDocuments('bible');
      setLoading(false);
      
      if (error) {
        console.error('Error mengambil versi Alkitab:', error);
        setError('Terjadi kesalahan saat memuat versi Alkitab. Silakan coba beberapa saat lagi.');
        return;
      }
      
      if (result && result.length > 0) {
        setBibleVersions(result.map((version: any) => ({
          id: version.id,
          name: version.name,
          shortName: version.shortName
        })));
        
        // Set default versi Alkitab ke versi pertama yang tersedia
        setSelectedVersion(result[0].id);
      } else {
        setError('Tidak ada versi Alkitab yang tersedia saat ini.');
      }
    }
    
    fetchBibleVersions();
  }, []);
  
  /**
   * Mengambil daftar kitab ketika versi Alkitab berubah
   */
  useEffect(() => {
    async function fetchBooks() {
      if (!selectedVersion) {
        setBooks([]);
        return;
      }
      
      setLoading(true);
      try {
        const { result, error } = await getSubCollection('bible', selectedVersion, 'books');
        setLoading(false);
        
        if (error) {
          console.error('Error mengambil kitab:', error);
          setError(`Error mengambil data kitab: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
        
        if (result && result.length > 0) {
          // Mengurutkan kitab berdasarkan nomor
          const sortedBooks = result.sort((a, b) => a.number - b.number);
          setBooks(sortedBooks);
          // Reset pilihan
          setSelectedBook('');
          setSelectedChapter('');
          setChapters([]);
          setVerses([]);
          setChapterContent([]);
          setChapterInfo(null);
        } else {
          setBooks([]);
          setError('Tidak ada kitab yang tersedia untuk versi Alkitab ini.');
        }
      } catch (err) {
        setLoading(false);
        console.error('Error in fetchBooks:', err);
        setError('Terjadi kesalahan saat memuat kitab.');
      }
    }
    
    fetchBooks();
  }, [selectedVersion]);
  
  /**
   * Mengambil daftar pasal ketika kitab berubah
   */
  useEffect(() => {
    async function fetchChapters() {
      if (!selectedVersion || !selectedBook) {
        setChapters([]);
        return;
      }
      
      setLoading(true);
      try {
        const { result, error } = await getSubCollection(
          'bible', selectedVersion, 'books', selectedBook, 'chapters'
        );
        setLoading(false);
        
        if (error) {
          console.error('Error mengambil pasal:', error);
          setError(`Error mengambil data pasal: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
        
        if (result && result.length > 0) {
          // Mengurutkan pasal berdasarkan nomor
          const sortedChapters = result.sort((a, b) => a.number - b.number);
          setChapters(sortedChapters);
          // Reset pilihan
          setSelectedChapter('');
          setVerses([]);
          setChapterContent([]);
          setChapterInfo(null);
        } else {
          setChapters([]);
          setError('Tidak ada pasal yang tersedia untuk kitab ini.');
        }
      } catch (err) {
        setLoading(false);
        console.error('Error in fetchChapters:', err);
        setError('Terjadi kesalahan saat memuat pasal.');
      }
    }
    
    fetchChapters();
  }, [selectedVersion, selectedBook]);
  
  /**
   * Mengambil daftar ayat ketika pasal berubah
   */
  useEffect(() => {
    async function fetchVerses() {
      if (!selectedVersion || !selectedBook || !selectedChapter) {
        setVerses([]);
        return;
      }
      
      setLoading(true);
      try {
        const { result, error } = await getSubCollection(
          'bible', selectedVersion, 'books', selectedBook, 'chapters', selectedChapter, 'verses'
        );
        setLoading(false);
        
        if (error) {
          console.error('Error mengambil ayat:', error);
          setError(`Error mengambil data ayat: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
        
        if (result && result.length > 0) {
          // Mengurutkan ayat berdasarkan nomor atau urutan jika tersedia
          const sortedVerses = result.sort((a, b) => {
            // Jika keduanya memiliki urutan, gunakan urutan
            if (a.urutan !== undefined && b.urutan !== undefined) {
              return a.urutan - b.urutan;
            }
            // Jika tidak, gunakan nomor
            return a.number - b.number;
          });
          
          setVerses(sortedVerses);
          
          // Set chapter content juga untuk tampilan satu pasal penuh
          setChapterContent(sortedVerses);
          
          // Set chapter info
          const selectedBookObj = books.find(book => book.id === selectedBook);
          const selectedChapterObj = chapters.find(chapter => chapter.id === selectedChapter);
          
          if (selectedBookObj && selectedChapterObj) {
            setChapterInfo({
              book: selectedBookObj.name,
              chapter: selectedChapterObj.number,
              totalVerses: sortedVerses.filter(v => v.type !== 'title').length
            });
          }
          
          // Reset pilihan ayat
          setSelectedVerse('');
        } else {
          setVerses([]);
          setChapterContent([]);
          setChapterInfo(null);
          setError('Tidak ada ayat yang tersedia untuk pasal ini.');
        }
      } catch (err) {
        setLoading(false);
        console.error('Error in fetchVerses:', err);
        setError('Terjadi kesalahan saat memuat ayat.');
      }
    }
    
    fetchVerses();
  }, [selectedVersion, selectedBook, selectedChapter, books, chapters]);
  
  /**
   * Menampilkan ayat tertentu ketika dipilih
   */
  useEffect(() => {
    if (selectedVerse && !showFullChapter) {
      const verse = verses.find(v => v.id === selectedVerse);
      if (verse) {
        setChapterContent([verse]);
      }
    } else if (showFullChapter) {
      setChapterContent(verses);
    }
  }, [selectedVerse, verses, showFullChapter]);
  
  /**
   * Handler untuk perubahan versi Alkitab
   */
  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVersion(e.target.value);
  };
  
  /**
   * Handler untuk perubahan kitab
   */
  const handleBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBook(e.target.value);
  };
  
  /**
   * Handler untuk perubahan pasal
   */
  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedChapter(e.target.value);
  };
  
  /**
   * Handler untuk perubahan ayat
   */
  const handleVerseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVerse(e.target.value);
  };
  
  /**
   * Handler untuk toggle tampilan pasal penuh atau ayat tunggal
   */
  const handleShowFullChapterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowFullChapter(e.target.checked);
    // Jika pasal penuh dipilih, reset tampilan ke seluruh ayat
    if (e.target.checked) {
      setChapterContent(verses);
    } else if (selectedVerse) {
      // Jika tidak dan ada ayat yang dipilih, tampilkan hanya ayat tersebut
      const verse = verses.find(v => v.id === selectedVerse);
      if (verse) {
        setChapterContent([verse]);
      }
    }
  };
  
  /**
   * Navigasi ke pasal sebelumnya
   */
  const goToPreviousChapter = async () => {
    if (!selectedChapter) return;
    
    const currentChapterIndex = chapters.findIndex(c => c.id === selectedChapter);
    
    if (currentChapterIndex > 0) {
      // Masih ada pasal sebelumnya dalam kitab yang sama
      setSelectedChapter(chapters[currentChapterIndex - 1].id);
    } else if (currentChapterIndex === 0) {
      // Kita berada di pasal pertama, coba pindah ke kitab sebelumnya
      const currentBookIndex = books.findIndex(b => b.id === selectedBook);
      
      if (currentBookIndex > 0) {
        const previousBook = books[currentBookIndex - 1];
        setSelectedBook(previousBook.id);
        
        // Ambil pasal dari kitab sebelumnya
        setLoading(true);
        try {
          const { result, error } = await getSubCollection(
            'bible', selectedVersion, 'books', previousBook.id, 'chapters'
          );
          setLoading(false);
          
          if (!error && result && result.length > 0) {
            const sortedChapters = result.sort((a, b) => a.number - b.number);
            // Pilih pasal terakhir dari kitab sebelumnya
            const lastChapter = sortedChapters[sortedChapters.length - 1];
            
            // Perbarui state chapters dahulu, kemudian set selectedChapter
            setChapters(sortedChapters);
            
            // Gunakan setTimeout untuk memastikan state chapters terupdate dulu
            setTimeout(() => {
              setSelectedChapter(lastChapter.id);
            }, 0);
          }
        } catch (err) {
          setLoading(false);
          console.error('Error navigating to previous book:', err);
        }
      }
    }
  };
  
  /**
   * Navigasi ke pasal berikutnya
   */
  const goToNextChapter = async () => {
    if (!selectedChapter) return;
    
    const currentChapterIndex = chapters.findIndex(c => c.id === selectedChapter);
    
    if (currentChapterIndex < chapters.length - 1) {
      // Masih ada pasal berikutnya dalam kitab yang sama
      setSelectedChapter(chapters[currentChapterIndex + 1].id);
    } else if (currentChapterIndex === chapters.length - 1) {
      // Kita berada di pasal terakhir, coba pindah ke kitab berikutnya
      const currentBookIndex = books.findIndex(b => b.id === selectedBook);
      
      if (currentBookIndex < books.length - 1) {
        const nextBook = books[currentBookIndex + 1];
        setSelectedBook(nextBook.id);
        
        // Ambil pasal dari kitab berikutnya
        setLoading(true);
        try {
          const { result, error } = await getSubCollection(
            'bible', selectedVersion, 'books', nextBook.id, 'chapters'
          );
          setLoading(false);
          
          if (!error && result && result.length > 0) {
            const sortedChapters = result.sort((a, b) => a.number - b.number);
            // Pilih pasal pertama dari kitab berikutnya
            const firstChapter = sortedChapters[0];
            
            // Perbarui state chapters dahulu, kemudian set selectedChapter
            setChapters(sortedChapters);
            
            // Gunakan setTimeout untuk memastikan state chapters terupdate dulu
            setTimeout(() => {
              setSelectedChapter(firstChapter.id);
            }, 0);
          }
        } catch (err) {
          setLoading(false);
          console.error('Error navigating to next book:', err);
        }
      }
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold text-center text-primary mb-8">Lihat Alkitab</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Panel Pencarian */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Cari Ayat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Versi Alkitab */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Versi Alkitab</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedVersion}
                onChange={handleVersionChange}
                disabled={loading || bibleVersions.length === 0}
              >
                {bibleVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Kitab */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Kitab</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedBook}
                onChange={handleBookChange}
                disabled={loading || books.length === 0}
              >
                <option value="" disabled>
                  {books.length > 0 ? 'Pilih Kitab' : 'Tidak ada kitab tersedia'}
                </option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Pasal */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Pasal</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedChapter}
                onChange={handleChapterChange}
                disabled={loading || chapters.length === 0}
              >
                <option value="" disabled>
                  {chapters.length > 0 ? 'Pilih Pasal' : 'Pilih kitab terlebih dahulu'}
                </option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.number}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Tampilan Ayat */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={showFullChapter}
                  onChange={handleShowFullChapterChange}
                  disabled={!selectedChapter}
                />
                <span className="label-text font-medium">Tampilkan Seluruh Pasal</span>
              </label>
            </div>
            
            {/* Ayat - hanya tampilkan jika tidak menampilkan seluruh pasal */}
            {!showFullChapter && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Ayat</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedVerse}
                  onChange={handleVerseChange}
                  disabled={loading || verses.length === 0}
                >
                  <option value="" disabled>
                    {verses.length > 0 ? 'Pilih Ayat' : 'Pilih pasal terlebih dahulu'}
                  </option>
                  {verses
                    .filter(verse => verse.type !== 'title')
                    .map((verse) => (
                      <option key={verse.id} value={verse.id}>
                        {verse.number}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Panel Konten Alkitab */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>
              {chapterInfo ? (
                <span>
                  {chapterInfo.book} {chapterInfo.chapter}
                  {!showFullChapter && selectedVerse && 
                    `:${verses.find(v => v.id === selectedVerse)?.number}`
                  }
                </span>
              ) : (
                <span>Konten Alkitab</span>
              )}
            </CardTitle>
            
            {chapterInfo && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={goToPreviousChapter}
                  disabled={loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6"></path></svg>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={goToNextChapter}
                  disabled={loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>
                </Button>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="loading loading-spinner loading-lg text-primary"></div>
              </div>
            ) : chapterContent.length > 0 ? (
              <div className="space-y-3 prose max-w-none">
                {chapterContent.map((verse) => (
                  <div 
                    key={verse.id} 
                    className={`${
                      verse.type === 'title' 
                        ? 'font-bold text-primary text-xl mb-4' 
                        : ''
                    }`}
                  >
                    {verse.type !== 'title' && (
                      <sup className="font-bold text-sm text-primary mr-1">
                        {verse.number}
                      </sup>
                    )}
                    <span 
                      dangerouslySetInnerHTML={{ __html: verse.text || '' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mx-auto mb-4 text-gray-400"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                <p>Pilih sebuah versi, kitab, dan pasal untuk mulai membaca</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 