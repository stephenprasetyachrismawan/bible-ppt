'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// Helper: Konversi URL youtube menjadi embed dengan loop
function getYoutubeEmbedUrl(url: string): string {
  try {
    const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|watch\?.+&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[1].length === 11) {
      const videoId = match[1];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&modestbranding=1&rel=0&loop=1&playlist=${videoId}`;
    }
    return '';
  } catch {
    return '';
  }
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import ReactMarkdown from 'react-markdown';
import parse from 'html-react-parser';
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
  
  // State untuk mode full screen
  const fullScreenHandle = useFullScreenHandle();
  // isFullScreen state will be synced with fullScreenHandle.active via FullScreen component's onChange prop
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);

  // State untuk pengaturan tampilan
  const [textSize, setTextSize] = useState(64); // Ukuran teks ayat default
  const [fontFamily, setFontFamily] = useState('Arial, sans-serif');
  const [isTextBold, setIsTextBold] = useState(false);
  const [referenceTextSize, setReferenceTextSize] = useState(48); // Ukuran font referensi default
  const [referenceFontFamily, setReferenceFontFamily] = useState('Arial, sans-serif');
  const [isReferenceTextBold, setIsReferenceTextBold] = useState(false);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [referenceTextColor, setReferenceTextColor] = useState('#FFFFFF');
  const [youtubeBgUrl, setYoutubeBgUrl] = useState('https://youtu.be/RgIxcrA7BfM?si=t5gk07e3fEyqP8TO');
  const [showFullScreenSettings, setShowFullScreenSettings] = useState(false);
  const fontOptions = [
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: "'Times New Roman', serif" },
    { name: 'Courier New', value: "'Courier New', monospace" },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
    { name: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
    { name: 'Impact', value: 'Impact, Charcoal, sans-serif' },
    { name: 'Comic Sans MS', value: "'Comic Sans MS', cursive" },
    { name: 'Lucida Console', value: "'Lucida Console', Monaco, monospace" },
    { name: 'Palatino Linotype', value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
    { name: 'Garamond', value: 'Garamond, serif' },
    { name: 'Bookman Old Style', value: "'Bookman Old Style', serif" },
    { name: 'Arial Black', value: "'Arial Black', Gadget, sans-serif" },
  ];
  const [backgroundTemplate, setBackgroundTemplate] = useState('default');
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.3);


  const [userUploadedBackgrounds, setUserUploadedBackgrounds] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Daftar template latar belakang VIDEO yang tersedia
  // PENTING: Ganti videoUrl dan posterUrl dengan URL video Anda sendiri yang valid dan berlisensi.
  // Video harus dioptimalkan untuk web (ukuran file kecil, format mp4/webm).
  // Default background templates
  const defaultBackgroundTemplates = useMemo(() => [
    { id: 'default', name: 'Default (Gelap)', videoUrl: '', posterUrl: '' }, // No specific video for default
    { id: 'nature_meadow', name: 'Padang Rumput', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-countryside-meadow-4075-small.mp4', posterUrl: 'https://assets.mixkit.co/videos/preview/mixkit-countryside-meadow-4075-thumb.jpg' },
    { id: 'ocean_waves', name: 'Ombak Laut', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-on-a-rocky-shore-2904-small.mp4', posterUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-on-a-rocky-shore-2904-thumb.jpg' },
    { id: 'sky_clouds', name: 'Awan Cepat', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fast-flying-through-white-clouds-34741-small.mp4', posterUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fast-flying-through-white-clouds-34741-thumb.jpg' },
    { id: 'jesus_cross_static', name: 'Salib Yesus (Statis)', videoUrl: 'https://cdn.pixabay.com/video/2020/04/04/35084-410166902_large.mp4', posterUrl: 'https://cdn.pixabay.com/vimeo/398885570/jesus-35084_1280x720.jpg' }, // Example from Pixabay, check license
    { id: 'mountains_fog', name: 'Pegunungan Berkabut', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-mountain-range-with-low-mist-4007-small.mp4', posterUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-mountain-range-with-low-mist-4007-thumb.jpg' },
    { id: 'rice_field_sunset', name: 'Sawah Matahari Terbenam', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-sunset-over-a-rice-field-4065-small.mp4', posterUrl: 'https://assets.mixkit.co/videos/preview/mixkit-sunset-over-a-rice-field-4065-thumb.jpg' },
    { id: 'abstract_particles', name: 'Partikel Abstrak', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-particles-background-4061-small.mp4', posterUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-particles-background-4061-thumb.jpg' },
  ], []);

  // Combine default and user-uploaded templates
  const backgroundTemplates = useMemo(() => {
    return [...defaultBackgroundTemplates, ...userUploadedBackgrounds];
  }, [defaultBackgroundTemplates, userUploadedBackgrounds]);

  // Effect to load user-uploaded backgrounds from localStorage on mount
  useEffect(() => {
    const storedUserUploads = localStorage.getItem('userUploadedBackgrounds');
    if (storedUserUploads) {
      try {
        const parsedUploads = JSON.parse(storedUserUploads);
        if (Array.isArray(parsedUploads)) {
          setUserUploadedBackgrounds(parsedUploads);
        }
      } catch (e) {
        console.error("Failed to parse userUploadedBackgrounds from localStorage", e);
      }
    }
  }, []); // Empty dependency array to run only on mount

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
   * Handler untuk masuk ke mode full screen
   */
  const enterFullScreen = () => {
    if (fullScreenHandle.active) return;
    const promise = fullScreenHandle.enter();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(err => {
        console.error('Error entering full screen with react-full-screen:', err);
        // If entering fails, onChange might not fire or fire with false.
        // Explicitly set state to false to ensure UI consistency.
        setIsFullScreen(false);
      });
    } else {
      console.error('fullScreenHandle.enter() did not return a Promise. Ensure <FullScreen> component is rendered.');
      setIsFullScreen(false); // Fallback
    }
    // setIsFullScreen(true) will be called by FullScreen's onChange when successful
  };

  const exitFullScreen = useCallback(() => {
    if (!fullScreenHandle.active) return;
    const promise = fullScreenHandle.exit();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(err => {
        console.error('Error exiting full screen with react-full-screen:', err);
        // onChange should handle state update. If exit fails, user might still be in fullscreen.
      });
    } else {
      console.error('fullScreenHandle.exit() did not return a Promise.');
    }
    // setIsFullScreen(false) will be called by FullScreen's onChange when successful
  }, [fullScreenHandle]);

  /**
   * Handler untuk navigasi ke ayat berikutnya
   */
  const nextVerse = () => {
    if (currentVerseIndex < chapterContent.length - 1) {
      setCurrentVerseIndex(currentVerseIndex + 1);
    }
  };

  /**
   * Handler untuk navigasi ke ayat sebelumnya
   */
  const prevVerse = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(currentVerseIndex - 1);
    }
  };

  /**
   * Menggunakan full screen handle dari 'react-full-screen' untuk navigasi keyboard
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Use the local isFullScreen state, which is synced by FullScreen's onChange
      if (!isFullScreen) return;

      if (event.key === 'ArrowRight') {
        nextVerse();
      } else if (event.key === 'ArrowLeft') {
        prevVerse();
      } else if (event.key === 'Escape') {
        exitFullScreen();
      }
    };

    // Add/remove listener based on the local isFullScreen state
    if (isFullScreen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen, nextVerse, prevVerse, exitFullScreen]);

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

  /**
   * Handler untuk mengubah ukuran teks
   */
  const changeTextSize = (size: number) => {
    setTextSize(size);
  };

  /**
   * Handler untuk mengubah jenis font
   */
  const changeFontFamily = (font: string) => {
    setFontFamily(font);
  };

  /**
   * Handler untuk mengubah template latar belakang
   */
  const changeBackgroundTemplate = (templateId: string) => {
    setBackgroundTemplate(templateId);
  };

  /**
   * Handler untuk mengubah opacity latar belakang
   */
  const changeBackgroundOpacity = (opacity: number) => {
    setBackgroundOpacity(opacity);
  };

  /**
   * Handler untuk mengubah warna teks
   */
  const changeTextColor = (color: string) => {
    setTextColor(color);
  };

  /**
   * Konten untuk tampilan full screen ayat
   */
  const renderFullScreenContent = () => {
    if (chapterContent.length === 0) return null;

    // Ayat saat ini
    const currentVerse = chapterContent[currentVerseIndex];
    // Dapatkan template latar belakang yang dipilih
    const selectedBg = backgroundTemplates.find(t => t.id === backgroundTemplate) || backgroundTemplates[0];

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col justify-center items-center p-4">
        {/* Latar belakang video (file atau YouTube) */}
        <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ opacity: backgroundOpacity / 100 }}>
          {/* File video biasa */}
          {selectedBg.videoUrl && !youtubeBgUrl && (
            <video
              key={selectedBg.id}
              src={selectedBg.videoUrl}
              poster={selectedBg.posterUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
          )}
          {/* YouTube background */}
          {youtubeBgUrl && (
            <iframe
              key={youtubeBgUrl}
              src={getYoutubeEmbedUrl(youtubeBgUrl)}
              allow="autoplay; encrypted-media"
              allowFullScreen
              frameBorder="0"
              className="absolute inset-0 w-full h-full object-cover z-0"
              style={{ pointerEvents: 'none' }}
              title="YouTube Background"
            />
          )}
        </div>

        {/* Panel Pengaturan Full Screen */}
        {isFullScreen && (
          <div className="fixed top-4 right-4 z-50 bg-black/80 rounded-lg p-4 shadow-lg max-w-xs flex flex-col gap-2">
            <button
              className="mb-2 text-white hover:text-primary font-bold text-sm self-end"
              onClick={() => setShowFullScreenSettings(!showFullScreenSettings)}
            >
              {showFullScreenSettings ? 'Tutup Pengaturan' : '⚙️ Pengaturan'}
            </button>
            {showFullScreenSettings && (
              <>
                <label className="text-white text-xs">Ukuran Font Ayat
                  <input type="range" min={0} max={100} value={textSize} onChange={e => setTextSize(Number(e.target.value))} className="w-full" />
                  <span className="text-white ml-2 text-xs align-middle">{textSize}</span>
                </label>
                <label className="text-white text-xs flex items-center gap-2 mt-1 mb-2">
                  <input type="checkbox" checked={isTextBold} onChange={e => setIsTextBold(e.target.checked)} />
                  <span>Tebal (Bold) Ayat</span>
                </label>
                <label className="text-white text-xs">Jenis Font Ayat
                  <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full rounded p-1 mt-1 mb-2" style={{color: 'black'}}>
                    {fontOptions.map(opt => <option key={opt.value} value={opt.value} style={{color: 'black', background: 'white'}}>{opt.name}</option>)}
                  </select>
                </label>
                <label className="text-white text-xs">Warna Teks Ayat
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-12 h-6 ml-2 align-middle" />
                </label>
                <hr className="my-2 border-gray-400" />
                <label className="text-white text-xs">Ukuran Font Referensi
                  <input type="range" min={0} max={100} value={referenceTextSize} onChange={e => setReferenceTextSize(Number(e.target.value))} className="w-full" />
                  <span className="text-white ml-2 text-xs align-middle">{referenceTextSize}</span>
                </label>
                <label className="text-white text-xs flex items-center gap-2 mt-1 mb-2">
                  <input type="checkbox" checked={isReferenceTextBold} onChange={e => setIsReferenceTextBold(e.target.checked)} />
                  <span>Tebal (Bold) Referensi</span>
                </label>
                <label className="text-white text-xs">Jenis Font Referensi
                  <select value={referenceFontFamily} onChange={e => setReferenceFontFamily(e.target.value)} className="w-full rounded p-1 mt-1 mb-2" style={{color: 'black'}}>
                    {fontOptions.map(opt => <option key={opt.value} value={opt.value} style={{color: 'black', background: 'white'}}>{opt.name}</option>)}
                  </select>
                </label>
                <label className="text-white text-xs">Warna Referensi
                  <input type="color" value={referenceTextColor} onChange={e => setReferenceTextColor(e.target.value)} className="w-12 h-6 ml-2 align-middle" />
                </label>
                <hr className="my-2 border-gray-400" />
                <label className="text-white text-xs">Transparansi Background
                  <input type="range" min={0} max={100} value={backgroundOpacity} onChange={e => setBackgroundOpacity(Number(e.target.value))} className="w-full" />
                  <span className="text-white ml-2 text-xs align-middle">{backgroundOpacity}</span>
                </label>
                <hr className="my-2 border-gray-400" />
                <label className="text-white text-xs">Background Video YouTube (URL)
                  <input type="text" value={youtubeBgUrl} onChange={e => setYoutubeBgUrl(e.target.value)} placeholder="https://youtube.com/..." className="w-full rounded p-1 mt-1 mb-2" />
                </label>
                <span className="text-gray-300 text-xs">Kosongkan untuk menggunakan background template biasa.</span>
              </>
            )}
          </div>
        )}

        {/* Kontainer untuk rasio 16:9 */}
        <div className="relative z-10 w-full h-full flex justify-center items-center p-4">
          {/* Kontainer dengan rasio aspek 16:9, padding atas untuk referensi */}
          <div className="aspect-[16/9] w-full max-w-[95vw] max-h-[95vh] bg-black/60 rounded-lg shadow-2xl flex flex-col justify-start items-center p-6 md:p-10 overflow-hidden pt-[20px]">
            {/* Informasi Kitab, Pasal, Ayat (Referensi) */}
            {chapterInfo && currentVerse && (
              <div style={{
                fontFamily: referenceFontFamily,
                fontSize: `${referenceTextSize}px`,
                color: referenceTextColor,
                fontWeight: isReferenceTextBold ? 'bold' : 'normal',
                textAlign: 'center',
                width: '90%',
                margin: '0 auto',
                marginBottom: '15px',
                lineHeight: '1.3'
              }}>
                {chapterInfo.book} {chapterInfo.chapter}:{currentVerse.number}
              </div>
            )}
            {/* Konten Ayat Utama */}
            <div className="w-full flex-grow overflow-y-auto flex flex-col justify-center items-center custom-scrollbar">
              <div
                className="prose-invert max-w-none leading-relaxed text-center"
                style={{ fontSize: `${textSize}px`, fontFamily, color: textColor, fontWeight: isTextBold ? 'bold' : 'normal' }}
              >
                {currentVerse.text ? parse(currentVerse.text.replace(/<\/?p>/g, '')) : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Tombol navigasi */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
          <Button 
            onClick={prevVerse} 
            disabled={currentVerseIndex === 0}
            className="bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12"
          >
            ←
          </Button>
          <Button 
            onClick={nextVerse} 
            disabled={currentVerseIndex === chapterContent.length - 1}
            className="bg-white/20 hover:bg-white/30 text-white rounded-full w-12 h-12"
          >
            →
          </Button>
        </div>
      </div>
    );
  };

  const handleVideoFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal mengunggah video.');
      }

      const newVideoTemplate = {
        id: `custom-${Date.now()}`,
        name: result.fileName || file.name, // Use filename from server if provided
        videoUrl: result.filePath, // Path relative to public folder
        posterUrl: '', // No poster for user uploads initially
      };

      setUserUploadedBackgrounds(prev => {
        const updated = [...prev, newVideoTemplate];
        localStorage.setItem('userUploadedBackgrounds', JSON.stringify(updated));
        return updated;
      });
      
      // Optionally, select the newly uploaded background
      // setBackgroundTemplate(newVideoTemplate.id);

      alert('Video berhasil diunggah dan ditambahkan ke daftar template!');

    } catch (err: any) {
      console.error('Error uploading video:', err);
      setError(`Gagal mengunggah video: ${err.message}`);
      alert(`Gagal mengunggah video: ${err.message}`);
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
                  {chapters.length > 0 ? 'Pilih Pasal' : 'Tidak ada pasal tersedia'}
                </option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.number}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Tampilkan Seluruh Pasal */}
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-medium">Tampilkan Seluruh Pasal</span> 
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary"
                  checked={showFullChapter} 
                  onChange={(e) => setShowFullChapter(e.target.checked)} 
                />
              </label>
            </div>

            {/* Ayat (hanya jika tidak menampilkan seluruh pasal) */}
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
                    {verses.length > 0 ? 'Pilih Ayat' : 'Tidak ada ayat tersedia'}
                  </option>
                  {verses.map((verse) => (
                    <option key={verse.id} value={verse.id}>
                      {verse.number}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel Tampilan */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Pratinjau</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : chapterContent.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">
                      {chapterInfo?.book} {chapterInfo?.chapter}
                      {!showFullChapter && `:${selectedVerse}`}
                    </h2>
                    <Button onClick={enterFullScreen} disabled={loading}>
                      Tampilkan Layar Penuh
                    </Button>
                  </div>
                  
                  <div className="prose max-w-none">
                    {chapterContent.map((verse) => (
                      <p key={verse.id} className="mb-4">
                        <span className="font-bold">{verse.number} </span>
                        {verse.text ? parse(verse.text.replace(/<\/?p>/g, '')) : ''}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Pilih kitab, pasal, dan ayat untuk melihat isi Alkitab</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full Screen Modal */}
      <FullScreen handle={fullScreenHandle} onChange={setIsFullScreen}>
        {isFullScreen && renderFullScreenContent()}
      </FullScreen>
    </div>
  );
}