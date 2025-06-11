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
import { Input } from '@/components/ui/input';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import ReactMarkdown from 'react-markdown';
import parse from 'html-react-parser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import getAllDocuments from '@/firebase/firestore/getAllData';
import getSubCollection from '@/firebase/firestore/getSubCollection';
import getDocument from '@/firebase/firestore/getData';

// Import from BibleVerseSearchResult type from geminiService
import { BibleVerseSearchResult } from '@/services/geminiService';

// For TypeScript purposes, define the interface locally
// and import the function separately
interface GeminiSearchResult extends BibleVerseSearchResult {
  id: string;
  bookId?: string;
  chapterId?: string;
  verses?: Array<{
    id: string;
    number: number;
    text?: string;
    type?: 'verse' | 'title';
  }>;
}

// Import the function with a full path
import { searchVerseWithGemini as searchVerseWithGeminiFunc } from '@/app/bible-reader/actions';

// Create a wrapper function to match the interface
const searchVerseWithGemini = async (
  query: string,
  apiKey: string,
  versionId: string
): Promise<{ results: GeminiSearchResult[]; error: string | null }> => {
  return await searchVerseWithGeminiFunc(query, apiKey, versionId);
};

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

  // State untuk pencarian
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeminiSearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);

  // State untuk hasil pencarian
  const [chapterContent, setChapterContent] = useState<Verse[]>([]);
  const [chapterInfo, setChapterInfo] = useState<{ book: string; chapter: number; totalVerses: number } | null>(null);
  
  // State untuk mode full screen
  const fullScreenHandle = useFullScreenHandle();
  // isFullScreen state will be synced with fullScreenHandle.active via FullScreen component's onChange prop
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);

  // State untuk pengaturan tampilan
  const [textSize, setTextSize] = useState(75);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isTextBold, setIsTextBold] = useState(false);
  const [referenceTextSize, setReferenceTextSize] = useState(67);
  const [referenceFontFamily, setReferenceFontFamily] = useState('Arial');
  const [isReferenceTextBold, setIsReferenceTextBold] = useState(true);
  const [textColor, setTextColor] = useState('#ffffff');
  const [referenceTextColor, setReferenceTextColor] = useState('#ffffff');
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
  const [backgroundOpacity, setBackgroundOpacity] = useState(50);


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
   * Load API key from environment variable or localStorage on mount
   */
  useEffect(() => {
    // Periksa apakah ada API key di environment variable
    const envApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (envApiKey) {
      console.log('Using Gemini API key from environment variable');
      setApiKey(envApiKey);
      setShowApiKeyForm(false);
      return;
    }
    
    // Jika tidak ada di env, coba ambil dari localStorage
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
      console.log('Using Gemini API key from localStorage');
      setApiKey(savedApiKey);
      setShowApiKeyForm(false);
    } else {
      // Jika tidak ditemukan di mana pun, tampilkan form
      console.log('No Gemini API key found, showing input form');
      setShowApiKeyForm(true);
    }
  }, []);

  /**
   * Save API key to localStorage when it changes
   */
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('geminiApiKey', apiKey);
      setShowApiKeyForm(false);
    }
  }, [apiKey]);

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
        
        // Set default version to "Terjemahan Baru Versi 2" or the first available
        const defaultVersion = result.find((v: any) => v.id === 'tb2-indonesia' || v.name.includes('Terjemahan Baru Versi 2')) || result[0];
        if (defaultVersion) {
          setSelectedVersion(defaultVersion.id);
        }
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
      const { result, error } = await getSubCollection(
        'bible', selectedVersion, 'books', selectedBook, 'chapters'
      );
      setLoading(false);
      
      if (error) {
        console.error('Error mengambil pasal:', error);
        setError('Terjadi kesalahan saat memuat pasal. Silakan coba beberapa saat lagi.');
        return;
      }
      
      if (result && result.length > 0) {
        // Mengurutkan pasal berdasarkan nomor
        const sortedChapters = result.sort((a, b) => a.number - b.number);
        setChapters(sortedChapters);
        
        console.log('Sorted chapters:', sortedChapters.map(c => `${c.id} (${c.number})`));
        
        // Periksa apakah kita memiliki hasil pencarian dengan chapterId
        if (searchResults.length > 0) {
          const searchResult = searchResults[0];
          console.log('Current search result:', searchResult);
          
          // Jika hasil pencarian memiliki book dan chapter yang cocok
          if (searchResult.bookId === selectedBook && searchResult.chapterId) {
            console.log(`Selecting chapter from search: ${searchResult.chapterId}`);
            
            // Periksa apakah chapter ada dalam daftar
            const chapterExists = sortedChapters.some(c => c.id === searchResult.chapterId);
            
            if (chapterExists) {
              // Set chapter yang cocok dengan hasil pencarian
              setSelectedChapter(searchResult.chapterId);
            } else {
              // Periksa apakah kita bisa menemukan chapter berdasarkan nomor
              const chapterNumber = parseInt(searchResult.chapterId);
              if (!isNaN(chapterNumber)) {
                const chapterByNumber = sortedChapters.find(c => c.number === chapterNumber);
                if (chapterByNumber) {
                  console.log(`Chapter ID not found, but matched by number: ${chapterByNumber.id}`);
                  setSelectedChapter(chapterByNumber.id);
                } else {
                  // Fallback ke chapter pertama
                  console.log(`Chapter not found, defaulting to first: ${sortedChapters[0].id}`);
                  setSelectedChapter(sortedChapters[0].id);
                }
              } else {
                // Fallback ke chapter pertama
                console.log(`Invalid chapter ID, defaulting to first: ${sortedChapters[0].id}`);
                setSelectedChapter(sortedChapters[0].id);
              }
            }
          } else if (!selectedChapter || !sortedChapters.find(c => c.id === selectedChapter)) {
            // Jika tidak ada search result yang cocok, pilih chapter pertama
            console.log(`No matching search result, selecting first chapter: ${sortedChapters[0].id}`);
            setSelectedChapter(sortedChapters[0].id);
          }
        } else if (!selectedChapter || !sortedChapters.find(c => c.id === selectedChapter)) {
          // Tidak ada search result dan tidak ada chapter yang dipilih,
          // pilih chapter pertama
          console.log(`No search result and no chapter selected, defaulting to first: ${sortedChapters[0].id}`);
          setSelectedChapter(sortedChapters[0].id);
        }
      } else {
        setChapters([]);
        setError('Tidak ada pasal yang tersedia untuk kitab ini.');
      }
    }
    
    fetchChapters();
  }, [selectedVersion, selectedBook, searchResults]);
  
  /**
   * Mengambil daftar ayat ketika pasal berubah
   */
  useEffect(() => {
    async function fetchVerses() {
      if (!selectedVersion || !selectedBook || !selectedChapter) {
        setVerses([]);
        setChapterContent([]);
        setChapterInfo(null);
        return;
      }
      
      setLoading(true);
      try {
        console.log(`Fetching document: bible/${selectedVersion}/books/${selectedBook}/chapters/${selectedChapter}`);
        
        const { result, error } = await getDocument(
          'bible',
          selectedVersion,
          'books',
          selectedBook,
          'chapters',
          selectedChapter
        );
        
        if (error) {
          console.error('Error mengambil ayat:', error);
          setError('Terjadi kesalahan saat memuat ayat. Silakan coba beberapa saat lagi.');
          setLoading(false);
          return;
        }
        
        if (!result) {
          console.log('No result returned from getDocument');
          setVerses([]);
          setChapterContent([]);
          setLoading(false);
          return;
        }
        
        if (!result.exists()) {
          console.log('Document does not exist');
          setVerses([]);
          setChapterContent([]);
          setLoading(false);
          return;
        }
        
        // Log the entire document data for debugging
        const chapterData = result.data();
        console.log('Chapter data (raw):', chapterData);
        
        // Simpan nomor pasal dari data yang diperoleh (akan digunakan dalam processVerses)
        const chapterNumber = chapterData.number;
        console.log(`Chapter number from Firestore: ${chapterNumber}`);
        
        // Use our helper function to extract verses safely
        const allVerses = extractVersesFromChapterData(chapterData);
        
        if (allVerses.length === 0) {
          // Try to get verses from subcollection as a fallback
          try {
            console.log('Trying to fetch verses using getSubCollection as fallback');
            const { result: versesResult, error: versesError } = await getSubCollection(
              'bible',
              selectedVersion,
              'books',
              selectedBook,
              'chapters',
              selectedChapter,
              'verses'
            );
            
            if (!versesError && versesResult && versesResult.length > 0) {
              console.log(`Found ${versesResult.length} verses using getSubCollection`);
              // Continue with these verses, passing chapterNumber
              processVerses(versesResult, chapterNumber);
            } else {
              console.log('No verses found using getSubCollection');
              setVerses([]);
              setChapterContent([]);
              setLoading(false);
            }
          } catch (subCollErr) {
            console.error('Error fetching verses as subcollection:', subCollErr);
            setVerses([]);
            setChapterContent([]);
            setLoading(false);
          }
          return;
        }
        
        // Process the verses we found, passing the chapter number from Firestore
        processVerses(allVerses, chapterNumber);
        
      } catch (err) {
        console.error('Error fetching verses:', err);
        setError('Terjadi kesalahan saat memuat ayat.');
        setLoading(false);
      }
    }
    
    fetchVerses();
  }, [selectedVersion, selectedBook, selectedChapter]); // Hanya reload ketika seleksi versi, buku, atau pasal berubah
  
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
    const newBookId = e.target.value;
    console.log(`Selecting book: ${newBookId}`);
    
    // Set the book ID - this will trigger fetching the chapters
    setSelectedBook(newBookId);
    
    // When changing books, reset chapter and verse selection
    setSelectedChapter('');
    setSelectedVerse('');
    setShowFullChapter(true);
    
    // Clear any search results when manually changing book
    setSearchResults([]);
    setSearchQuery('');
  };
  
  /**
   * Handler untuk perubahan pasal
   */
  const handleChapterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newChapterId = e.target.value;
    console.log(`Selecting chapter: ${newChapterId}`);
    
    // Set the chapter ID - this will trigger fetching the verses
    setSelectedChapter(newChapterId);
    
    // When changing chapters, reset verse selection and show full chapter
    setSelectedVerse('');
    setShowFullChapter(true);
    
    // Clear any search results when manually changing chapter
    setSearchResults([]);
    setSearchQuery('');
  };
  
  /**
   * Handler untuk perubahan ayat
   */
  const handleVerseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVerseId = e.target.value;
    console.log(`Selected verse from dropdown: ${selectedVerseId}`);
    
    // Perbarui state verse yang dipilih
    setSelectedVerse(selectedVerseId);
    
    if (selectedVerseId) {
      // Ketika ayat dipilih, otomatis beralih ke tampilan ayat (bukan full chapter)
      setShowFullChapter(false);
    } else {
      // Jika tidak ada ayat yang dipilih, tampilkan seluruh pasal
      setShowFullChapter(true);
    }
    
    // Reset search results ketika dropdown diubah manual
    setSearchResults([]);
    setSearchQuery('');
  };
  
  /**
   * Handler untuk perubahan tampilan seluruh pasal
   */
  const handleShowFullChapterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const showFull = e.target.checked;
    console.log(`Toggle show full chapter: ${showFull}`);
    
    // Set flag untuk menampilkan seluruh pasal atau hanya ayat tertentu
    setShowFullChapter(showFull);
    
    // Konten pratinjau akan diperbarui oleh useEffect terpisah
    // berdasarkan nilai showFullChapter
    
    // Reset hasil pencarian jika ada
    if (searchResults.length > 0) {
      setSearchResults([]);
      setSearchQuery('');
    }
  };
  
  /**
   * Helper function to fetch and set chapter content
   */
  const fetchChapterContent = async () => {
    if (!selectedVersion || !selectedBook || !selectedChapter) {
      return;
    }
    
    try {
      console.log(`Fetching chapter content: bible/${selectedVersion}/books/${selectedBook}/chapters/${selectedChapter}`);
      
      const { result, error } = await getDocument(
        'bible',
        selectedVersion,
        'books',
        selectedBook,
        'chapters',
        selectedChapter
      );
      
      if (error) {
        console.error('Error fetching chapter content:', error);
        return;
      }
      
      if (!result || !result.exists()) {
        console.error('Chapter document does not exist');
        return;
      }
      
      const chapterData = result.data();
      console.log('Chapter data (raw):', chapterData);
      
      // Simpan nomor pasal dari data yang diperoleh
      const chapterNumber = chapterData.number;
      console.log(`Chapter number from Firestore: ${chapterNumber}`);
      
      // Perbarui chapterInfo dengan nomor pasal yang benar
      getDocument(
        'bible',
        selectedVersion,
        'books',
        selectedBook
      ).then(({ result: bookResult }) => {
        const bookName = bookResult && bookResult.exists() ? bookResult.data().name : selectedBook;
        setChapterInfo({
          book: bookName,
          chapter: chapterNumber,
          totalVerses: 0 // Akan diperbarui nanti ketika verses selesai diproses
        });
      }).catch(err => {
        console.error('Error getting book details:', err);
      });
      
      // Use our helper function to extract verses safely
      let allVerses = extractVersesFromChapterData(chapterData);
      
      if (allVerses.length === 0) {
        // Try to get verses from subcollection as a fallback
        try {
          console.log('Trying to fetch verses using getSubCollection as fallback in fetchChapterContent');
          const { result: versesResult, error: versesError } = await getSubCollection(
            'bible',
            selectedVersion,
            'books',
            selectedBook,
            'chapters',
            selectedChapter,
            'verses'
          );
          
          if (!versesError && versesResult && versesResult.length > 0) {
            console.log(`Found ${versesResult.length} verses using getSubCollection in fetchChapterContent`);
            allVerses = versesResult;
          } else {
            console.log('No verses found using getSubCollection in fetchChapterContent');
            return;
          }
        } catch (subCollErr) {
          console.error('Error fetching verses as subcollection in fetchChapterContent:', subCollErr);
          return;
        }
      }
      
      if (allVerses.length === 0) {
        console.error('No verses found in chapter data after all attempts');
        return;
      }
      
      console.log(`Found ${allVerses.length} verses in chapter data`);
      
      // Filter only actual verses (not titles) for verse count
      const onlyVerses = allVerses.filter((verse: Verse) => verse.type === 'verse' || !verse.type);
      
      // Perbarui total jumlah ayat dalam chapterInfo
      setChapterInfo(prev => {
        if (!prev) return null;
        return { ...prev, totalVerses: onlyVerses.length };
      });
      
      // Sort all verses by urutan or number
      const sortedVerses = [...allVerses].sort((a: Verse, b: Verse) => {
        // Sort by "urutan" field if available
        if (a.urutan !== undefined && b.urutan !== undefined) {
          return a.urutan - b.urutan;
        }
        
        // For verses, sort by number
        if ((a.type === 'verse' || !a.type) && (b.type === 'verse' || !b.type)) {
          return (a.number || 0) - (b.number || 0);
        }
        
        // Keep titles at their position (they should have urutan set)
        return 0;
      });
      
      // Make sure we have content
      console.log(`Setting chapter content with ${sortedVerses.length} verses from fetchChapterContent`);
      setChapterContent(sortedVerses);
    } catch (err) {
      console.error('Error fetching chapter content:', err);
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
                  <input type="range" min={0} max={120} value={textSize} onChange={e => setTextSize(Number(e.target.value))} className="w-full" />
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
                  <input type="range" min={0} max={120} value={referenceTextSize} onChange={e => setReferenceTextSize(Number(e.target.value))} className="w-full" />
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
                {chapterInfo.book || ""} {typeof chapterInfo.chapter === 'number' ? chapterInfo.chapter : ""}:{currentVerse.number || ""}
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

  /**
   * Handle search form submission
   */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setSearchError('Masukkan referensi ayat untuk pencarian');
      return;
    }
    
    if (!apiKey) {
      // Coba dapatkan API key dari environment variable sebagai fallback
      const envApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (envApiKey) {
        setApiKey(envApiKey);
      } else {
        setShowApiKeyForm(true);
        setSearchError('Kunci API Gemini diperlukan untuk pencarian');
        return;
      }
    }
    
    if (!selectedVersion) {
      setSearchError('Pilih versi Alkitab terlebih dahulu');
      return;
    }
    
    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);
    
    try {
      console.log(`Searching for: "${searchQuery}"`);
      
      const { results, error } = await searchVerseWithGemini(
        searchQuery,
        apiKey,
        selectedVersion
      );
      
      if (error) {
        setSearchError(error);
      } else if (results.length === 0) {
        setSearchError('Tidak ditemukan referensi ayat yang sesuai');
      } else {
        console.log('Search results:', results);
        
        // Automatically load the first valid result
        const validResult = results.find(result => result.bookId && result.chapterId);
        if (validResult) {
          console.log('Loading valid search result:', validResult);
          
          // Save search results first - this affects how fetchChapters and fetchVerses behave
          setSearchResults(results);
          
          // Update book selection - this will trigger fetchChapters
          setSelectedBook(validResult.bookId!);
          
          // We'll set the chapter in fetchChapters useEffect to ensure
          // it's available in the dropdown
          
          // Reset verse selection - we'll set it after verses are loaded via useEffect
          setSelectedVerse('');
          
          // Set showFullChapter based on whether specific verses are requested
          if (validResult.verseStart) {
            console.log(`Specific verse range requested: ${validResult.verseStart}-${validResult.verseEnd || validResult.verseStart}`);
            setShowFullChapter(false);
          } else {
            console.log('No specific verse requested, showing full chapter');
            setShowFullChapter(true);
          }
        } else {
          setSearchResults(results);
          setSearchError('Hasil pencarian tidak mengandung referensi ayat yang valid');
        }
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Terjadi kesalahan saat pencarian');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Load a search result directly
   */
  const loadSearchResult = (result: GeminiSearchResult) => {
    if (result.bookId && result.chapterId) {
      console.log('Directly loading search result:', result);
      
      // Update search results to only include this result - do this first
      // as it affects how fetchChapters behaves
      setSearchResults([result]);
      
      // Update book selection - this will trigger fetchChapters
      setSelectedBook(result.bookId);
      
      // We'll set the chapter in fetchChapters useEffect to ensure
      // it's available in the dropdown
      
      // Reset verse selection - we'll set it after verses are loaded through the useEffect
      // that monitors verses and searchResults
      setSelectedVerse('');
      
      // Set showFullChapter based on whether specific verses are requested
      if (result.verseStart) {
        console.log(`Specific verse range requested: ${result.verseStart}-${result.verseEnd || result.verseStart}`);
        setShowFullChapter(false);
      } else {
        console.log('No specific verse requested, showing full chapter');
        setShowFullChapter(true);
      }
      
      // Clear search query
      setSearchQuery('');
    }
  };

  /**
   * Effect to update verse selection when verses load and we have search results with specific verse
   */
  useEffect(() => {
    // Hanya jalankan jika memiliki hasil pencarian dan ayat telah dimuat
    if (searchResults.length === 0 || verses.length === 0) {
      return; // Tidak perlu memproses
    }

    // Ambil hasil pencarian pertama
    const result = searchResults[0];
    if (!result.verseStart) {
      return; // Tidak ada nomor ayat spesifik yang diminta
    }

    console.log(`Mencari ayat dengan nomor ${result.verseStart} dari ${verses.length} ayat`);
    
    // Cari ayat yang sesuai dengan nomor di hasil pencarian
    const verseToSelect = verses.find(v => v.number === result.verseStart);
    
    if (verseToSelect) {
      console.log(`Menemukan dan memilih ayat nomor ${result.verseStart}, id: ${verseToSelect.id}`);
      
      // Set pilihan ayat di dropdown, tapi jangan langsung update konten
      // Update konten akan dilakukan oleh useEffect terpisah
      setSelectedVerse(verseToSelect.id);
      
      // Untuk hasil pencarian, selalu tampilkan ayat spesifik (bukan pasal lengkap)
      setShowFullChapter(false);
    } else {
      console.log(`Ayat dengan nomor ${result.verseStart} tidak ditemukan`);
      
      // Jika tidak bisa menemukan ayat yang persis sama, coba cari ayat terdekat
      const closestVerse = verses.reduce((prev, curr) => {
        const prevDiff = Math.abs((prev.number || 0) - (result.verseStart || 1));
        const currDiff = Math.abs((curr.number || 0) - (result.verseStart || 1));
        return prevDiff < currDiff ? prev : curr;
      });
      
      if (closestVerse) {
        console.log(`Menggunakan ayat terdekat: ${closestVerse.number} (id: ${closestVerse.id})`);
        setSelectedVerse(closestVerse.id);
        setShowFullChapter(false);
      }
    }
  }, [verses, searchResults]); // Hanya jalankan ketika verses atau searchResults berubah

  /**
   * Handle API key form submission
   */
  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey) {
      setShowApiKeyForm(false);
    }
  };

  /**
   * Helper function to safely extract verses from chapter data in various formats
   * @param chapterData The chapter data from Firestore
   * @returns Array of verses found
   */
  const extractVersesFromChapterData = (chapterData: any): Verse[] => {
    if (!chapterData) {
      console.log('Chapter data is null or undefined');
      return [];
    }
    
    console.log('Chapter data keys:', Object.keys(chapterData));
    
    // Check if verses is directly in the data
    if (chapterData.verses && Array.isArray(chapterData.verses) && chapterData.verses.length > 0) {
      console.log(`Found ${chapterData.verses.length} verses in chapter.verses`);
      return chapterData.verses;
    }
    
    // Check if content field has the verses
    if (chapterData.content && Array.isArray(chapterData.content) && chapterData.content.length > 0) {
      console.log(`Found ${chapterData.content.length} verses in chapter.content`);
      return chapterData.content;
    }
    
    // Check if data.verses exists
    if (chapterData.data && chapterData.data.verses && Array.isArray(chapterData.data.verses) && chapterData.data.verses.length > 0) {
      console.log(`Found ${chapterData.data.verses.length} verses in chapter.data.verses`);
      return chapterData.data.verses;
    }
    
    // Check if we have a 'text' field in the chapter itself (some implementations store it this way)
    if (chapterData.text) {
      console.log('Found chapter with text field directly');
      return [{
        id: 'single-verse',
        number: 1,
        text: chapterData.text,
        type: 'verse'
      }];
    }
    
    // Try to see if any top-level fields look like verses
    const possibleVerses = Object.entries(chapterData)
      .filter(([key, value]: [string, any]) => 
        value && typeof value === 'object' && (value.text || value.number || value.type === 'verse'))
      .map(([key, value]: [string, any]) => ({
        id: key,
        ...value
      }));
    
    if (possibleVerses.length > 0) {
      console.log(`Found ${possibleVerses.length} possible verses as top-level objects`);
      return possibleVerses;
    }
    
    console.log('No verses found in chapter data');
    console.log('Full chapter data:', JSON.stringify(chapterData, null, 2));
    return [];
  };

  // Helper function to process verses once we've found them
  function processVerses(allVerses: Verse[], chapterNumber: number) {
    // Get book name for reference
    getDocument(
      'bible',
      selectedVersion,
      'books',
      selectedBook
    ).then(({ result: bookResult }) => {
      const bookName = bookResult && bookResult.exists() ? bookResult.data().name : selectedBook;
      
      // Filter only actual verses (not titles)
      const onlyVerses = allVerses.filter((verse: Verse) => verse.type === 'verse' || !verse.type);
      console.log(`Found ${onlyVerses.length} actual verses (not titles)`);
      
      // Sort verses by number
      const sortedVerses = [...onlyVerses].sort((a, b) => (a.number || 0) - (b.number || 0));
      
      // Update verses dropdown options
      setVerses(sortedVerses);
      
      // Set chapter info
      setChapterInfo({
        book: bookName,
        chapter: chapterNumber,
        totalVerses: sortedVerses.length
      });
      
      // Tidak perlu lagi mengatur konten pratinjau di sini
      // Konten pratinjau akan diatur oleh useEffect terpisah yang sudah dioptimalkan
      
      setLoading(false);
    }).catch(err => {
      console.error('Error getting book details:', err);
      setLoading(false);
    });
  }

  /**
   * Effect that updates the display based on dropdown selections
   * This is optimized to only run once when all data is ready
   */
  useEffect(() => {
    // Hanya jalankan jika tidak loading dan semua data yang diperlukan tersedia
    if (loading || verses.length === 0) {
      return; // Data belum siap
    }

    if (!selectedVersion || !selectedBook || !selectedChapter) {
      console.log('Tidak ada pilihan lengkap kitab/pasal');
      return; // Tidak cukup pilihan untuk menampilkan apapun
    }

    console.log(`Memperbarui pratinjau dengan: ${selectedBook}, pasal ${selectedChapter}, ayat ${selectedVerse || 'semua'}, fullChapter=${showFullChapter}`);

    // Hanya update konten jika memang perlu
    if (showFullChapter) {
      // Tampilkan seluruh pasal
      console.log(`Menampilkan pasal lengkap dengan ${verses.length} ayat`);
      
      // Urutkan semua ayat termasuk judul
      const allVerses = [...verses];
      const sortedVerses = allVerses.sort((a, b) => {
        if (a.urutan !== undefined && b.urutan !== undefined) {
          return a.urutan - b.urutan;
        }
        return (a.number || 0) - (b.number || 0);
      });
      
      setChapterContent(sortedVerses);
    } else if (selectedVerse) {
      // Tampilkan ayat tertentu
      const verse = verses.find(v => v.id === selectedVerse);
      if (verse) {
        console.log(`Menampilkan ayat terpilih: ${verse.number}`);
        setChapterContent([verse]);
      } else if (verses.length > 0) {
        console.log(`Ayat terpilih tidak ditemukan, default ke ayat pertama`);
        setChapterContent([verses[0]]);
      }
    } else if (searchResults.length > 0 && searchResults[0].verseStart) {
      // Tampilkan ayat berdasarkan rentang pencarian
      const result = searchResults[0];
      const start = result.verseStart || 0;
      const end = result.verseEnd || start;
      
      const versesInRange = verses.filter(v => {
        if (v.type !== 'verse' && v.type !== undefined) return false;
        return (v.number || 0) >= start && (v.number || 0) <= end;
      });
      
      if (versesInRange.length > 0) {
        console.log(`Menampilkan ${versesInRange.length} ayat dari rentang ${start}-${end}`);
        setChapterContent(versesInRange);
      } else {
        console.log(`Tidak ada ayat dalam rentang ${start}-${end}, menampilkan pasal lengkap`);
        setChapterContent(verses);
      }
    } else {
      // Default: tampilkan semua ayat
      console.log('Tidak ada pilihan spesifik, menampilkan semua ayat');
      setChapterContent(verses);
    }
  }, [verses, selectedVerse, showFullChapter, searchResults]); // Perbarui saat ayat, pilihan ayat, atau hasil pencarian berubah

  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-3xl font-bold text-center text-primary mb-8">Lihat Alkitab</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* API Key Form (jika diperlukan) */}
      {showApiKeyForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Kunci API Gemini</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApiKeySubmit} className="space-y-4">
              <div>
                <Input 
                  type="password" 
                  placeholder="Masukkan kunci API Gemini Anda" 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Kunci API diperlukan untuk fitur pencarian dan akan disimpan di browser Anda.
                </p>
              </div>
              <Button type="submit">Simpan Kunci API</Button>
            </form>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Panel Pencarian */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Cari Ayat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pencarian dengan Gemini */}
            <form onSubmit={handleSearch} className="space-y-4 mb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pencarian Referensi Ayat</label>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Contoh: Matius 3:1-3 atau Mat 3" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isSearching} size="sm">
                    {isSearching ? 'Mencari...' : 'Cari'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Masukkan referensi ayat seperti "Matius 3:1-3" atau "Mat 3"
                </p>
              </div>
              
              {searchError && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-sm">{searchError}</AlertDescription>
                </Alert>
              )}
              
              {/* Hasil Pencarian - Simplified to only show if we have multiple results */}
              {searchResults.length > 1 && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-medium">Hasil Pencarian Lainnya:</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {searchResults.slice(1).map((result) => (
                      <Card key={result.id} className="p-3">
                        <div className="flex flex-col">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-sm font-bold">
                              {result.book} {result.chapter}
                              {result.verseStart ? `:${result.verseStart}${result.verseEnd && result.verseEnd !== result.verseStart ? `-${result.verseEnd}` : ''}` : ''}
                            </h4>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => loadSearchResult(result)}
                              disabled={!result.bookId || !result.chapterId}
                              className="h-6 text-xs px-2"
                            >
                              Lihat
                            </Button>
                          </div>
                          
                          {/* Pratinjau Ayat */}
                          {result.verses && result.verses.length > 0 ? (
                            <div className="text-xs space-y-1">
                              {result.verses.slice(0, 2).map((verse) => (
                                <div key={verse.id}>
                                  <span className="font-semibold">{verse.number}</span>: {verse.text}
                                </div>
                              ))}
                              {result.verses.length > 2 && (
                                <div className="text-xs text-gray-500 italic">
                                  ...dan {result.verses.length - 2} ayat lainnya
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">
                              {result.bookId && result.chapterId 
                                ? 'Klik "Lihat" untuk membuka ayat ini'
                                : 'Referensi ayat tidak ditemukan dalam versi Alkitab yang dipilih'}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </form>
          
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
                  onChange={handleShowFullChapterChange} 
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
                      {chapterInfo?.book || ""} {typeof chapterInfo?.chapter === 'number' ? chapterInfo.chapter : ""}
                      {!showFullChapter && selectedVerse && `:${verses.find(v => v.id === selectedVerse)?.number || ''}`}
                    </h2>
                    <Button onClick={enterFullScreen} disabled={loading}>
                      Tampilkan Layar Penuh
                    </Button>
                  </div>
                  
                  <div className="prose max-w-none">
                    {chapterContent.map((verse) => (
                      <div key={verse.id} className="mb-4">
                        {verse.type === 'title' ? (
                          <h3 className="font-semibold my-3">{verse.text}</h3>
                        ) : (
                          <p>
                            <span className="font-bold">{verse.number || ''} </span>
                            {verse.text ? parse(verse.text.replace(/<\/?p>/g, '')) : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500 mt-4">
                    Menampilkan {chapterContent.length} ayat
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

      {/* FullScreen component for displaying verses in presentation mode */}
      <FullScreen handle={fullScreenHandle} onChange={setIsFullScreen}>
        {isFullScreen && renderFullScreenContent()}
      </FullScreen>
    </div>
  );
}