'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HexColorPicker } from 'react-colorful';

// Define types for Bible data structure
type VerseContent = string;
type VerseMap = Record<string, VerseContent>;
type ChapterMap = Record<string, VerseMap>;
type BibleData = Record<string, ChapterMap>;

// Define types for verse objects
interface Verse {
  id: string;
  number: number;
  text?: string;
  type?: 'verse' | 'title';
  urutan?: number;
}

// Import Firestore utilities
import getAllDocuments from '@/firebase/firestore/getAllData';
import getSubCollection from '@/firebase/firestore/getSubCollection';
import getDocument from '@/firebase/firestore/getData';
import documentExists from '@/firebase/firestore/documentExists';
import testFirestoreConnection from '@/firebase/firestore/testConnection';
import addData from '@/firebase/firestore/addData';

// Tambahkan import untuk komponen Modal dan FloatingButton
import Modal from '@/components/Modal';
import FloatingButton from '@/components/FloatingButton';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [bibleVersions, setBibleVersions] = useState<Array<{id: string, name: string, shortName?: string}>>([]);
  
  // State for selected verses and presentations
  const [selectedVerses, setSelectedVerses] = useState<string[]>([]);
  const [generatingPpt, setGeneratingPpt] = useState(false);
  
  // Presentation options
  const [pptOptions, setPptOptions] = useState({
    size: '16:9',
    versesPerSlide: 1,
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    fontSize: 24,
    maxCharsPerSlide: 200,
    font: 'Arial',
    fontWeight: 'normal',
    borderColor: 'transparent',
    borderWidth: 0,
    hasBorder: false
  });
  
  // Subtitle options
  const [subtitleOptions, setSubtitleOptions] = useState<{
    maxChars: number;
    font: string;
    fontSize: number;
    background: string;
    textColor: string;
    fontWeight: string;
    borderColor: string;
    borderWidth: number;
    hasBorder: boolean;
  }>({
    maxChars: 150,
    font: 'Arial',
    fontSize: 28,
    background: '#000000',
    textColor: '#FFFFFF',
    fontWeight: 'normal',
    borderColor: '#FFFFFF',
    borderWidth: 0,
    hasBorder: false
  });
  
  // State for books, chapters, and verses
  const [books, setBooks] = useState<Array<{id: string, name: string, number: number}>>([]);
  const [startChapters, setStartChapters] = useState<Array<{id: string, number: number}>>([]);
  const [startVerses, setStartVerses] = useState<Array<{id: string, number: number, text?: string, type?: string, urutan?: number}>>([]);
  const [endChapters, setEndChapters] = useState<Array<{id: string, number: number}>>([]);
  const [endVerses, setEndVerses] = useState<Array<{id: string, number: number, text?: string, type?: string, urutan?: number}>>([]);
  
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
  
  // Color picker visibility state
  const [showPptBgColorPicker, setShowPptBgColorPicker] = useState(false);
  const [showPptTextColorPicker, setShowPptTextColorPicker] = useState(false);
  const [showSubtitleBgColorPicker, setShowSubtitleBgColorPicker] = useState(false);
  const [showSubtitleTextColorPicker, setShowSubtitleTextColorPicker] = useState(false);
  const [showBorderColorPicker, setShowBorderColorPicker] = useState(false);
  const [showSubtitleBorderColorPicker, setShowSubtitleBorderColorPicker] = useState(false);
  
  // Tambahkan state untuk color picker tengah layar
  const [centralColorPicker, setCentralColorPicker] = useState<{
    show: boolean;
    color: string;
    onChange: (color: string) => void;
  }>({
    show: false,
    color: '#000000',
    onChange: () => {}
  });
  
  // Fungsi untuk membuka color picker di tengah layar
  const openCentralColorPicker = (color: string, onChange: (color: string) => void) => {
    setCentralColorPicker({
      show: true,
      color,
      onChange
    });
  };
  
  // Fungsi untuk menutup color picker
  const closeCentralColorPicker = () => {
    setCentralColorPicker(prev => ({...prev, show: false}));
  };
  
  // New tab state
  const [selectedTab, setSelectedTab] = useState<'presentation' | 'subtitle'>('subtitle');
  
  // Tambahkan state untuk modal dan floating button
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'options' | 'verse'>('verse');
  
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
        const aUrutan = 'urutan' in a && a.urutan !== undefined ? a.urutan : a.number;
        const bUrutan = 'urutan' in b && b.urutan !== undefined ? b.urutan : b.number;
        return aUrutan - bUrutan;
      });
      
      // Create structured array with order info
      const allOrderedContent = allChapterContent.map((item, index) => {
        return {
          order: index,
          id: item.id,
          number: item.number,
          text: item.text || '',
          type: 'type' in item ? item.type : 'verse',
          urutan: 'urutan' in item && item.urutan !== undefined ? item.urutan : item.number
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

  // Handle verse selection
  const handleVerseSelection = (verseKey: string) => {
    setSelectedVerses(prev => {
      if (prev.includes(verseKey)) {
        return prev.filter(key => key !== verseKey);
      } else {
        return [...prev, verseKey];
      }
    });
  };
  
  // Handle presentation option changes
  const handlePptOptionChange = (option: string, value: string | number) => {
    setPptOptions(prev => {
      let updatedValue = value;
      
      // Special handling for certain options
      if (option === 'versesPerSlide') {
        // Ensure it's a number and at least 1
        updatedValue = typeof value === 'string' ? parseInt(value, 10) : value;
        updatedValue = Math.max(1, Number(updatedValue) || 1);
      } else if (option === 'maxCharsPerSlide') {
        // Ensure it's a number with sane limits
        updatedValue = typeof value === 'string' ? parseInt(value, 10) : value;
        updatedValue = Math.max(50, Math.min(500, Number(updatedValue) || 200));
      }
      
      return {
        ...prev,
        [option]: updatedValue
      };
    });
  };
  
  // Handle subtitle option changes
  const handleSubtitleOptionChange = (option: string, value: string | number) => {
    setSubtitleOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };
  
  // Helper function to strip HTML tags
  const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    
    // Create a temporary div element
    const tempDiv = document.createElement('div');
    // Set the HTML content
    tempDiv.innerHTML = html;
    // Get the text content
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // Generate and download PowerPoint
  const generatePowerPoint = async (type: 'presentation' | 'subtitle') => {
    if (!searchResults || selectedVerses.length === 0) {
      setError('Pilih minimal satu ayat atau judul untuk dibuat presentasi.');
      return;
    }
    
    setGeneratingPpt(true);
    
    try {
      // Client-side only
      const pptxgen = (await import('pptxgenjs')).default;
      
      // Group verses for slides based on versesPerSlide or charsPerSlide
      const versesToInclude = selectedVerses.sort((a, b) => {
        // Sort by verse number or by position in versesOrder
        if (searchResults.versesOrder) {
          return searchResults.versesOrder.indexOf(a) - searchResults.versesOrder.indexOf(b);
        }
        
        // Fallback sorting (titles first, then verse numbers)
        if (a.startsWith('title-') && !b.startsWith('title-')) return -1;
        if (!a.startsWith('title-') && b.startsWith('title-')) return 1;
        
        // Both are verses, sort by number
        if (!a.startsWith('title-') && !b.startsWith('title-')) {
          return parseInt(a) - parseInt(b);
        }
        
        // Both are titles, maintain original order
        return 0;
      });
      
      // Initialize clean content map (with HTML stripped)
      const cleanVerses: Record<string, string> = {};
      for (const key in searchResults.verses) {
        cleanVerses[key] = stripHtmlTags(searchResults.verses[key]);
      }
      
      if (type === 'presentation') {
        // Create a new presentation
        const pres = new pptxgen();
        
        // Set slide size based on options
        if (pptOptions.size === '16:9') {
          pres.layout = 'LAYOUT_16x9';
        } else {
          pres.layout = 'LAYOUT_4x3';
        }
        
        // Process verses in groups based on versesPerSlide or maxCharsPerSlide
        if (parseInt(String(pptOptions.versesPerSlide)) === 1 && pptOptions.maxCharsPerSlide) {
          // Use character limit mode when versesPerSlide is 1
          let currentSlideText = '';
          let currentSlideCharCount = 0;
          let slideVerseKeys: string[] = [];
          
          for (const verseKey of versesToInclude) {
            const verseText = cleanVerses[verseKey];
            const verseDisplayText = verseKey.startsWith('title-') ? 
              verseText : 
              `${verseKey}. ${verseText}`;
            
            const verseLength = verseDisplayText.length;
            
            // Check if adding this verse would exceed the character limit
            if (currentSlideCharCount + verseLength > pptOptions.maxCharsPerSlide && currentSlideText !== '') {
              // Create a slide with the current accumulated text
              createPresentationSlide(pres, slideVerseKeys, searchResults, cleanVerses, pptOptions);
              
              // Reset for next slide
              currentSlideText = verseDisplayText;
              currentSlideCharCount = verseLength;
              slideVerseKeys = [verseKey];
            } else {
              // Add verse to current slide
              currentSlideText += (currentSlideText ? '\n\n' : '') + verseDisplayText;
              currentSlideCharCount += verseLength + (currentSlideText === verseDisplayText ? 0 : 2); // +2 for newlines
              slideVerseKeys.push(verseKey);
            }
          }
          
          // Don't forget the last slide if there's text left
          if (currentSlideText.trim() !== '') {
            createPresentationSlide(pres, slideVerseKeys, searchResults, cleanVerses, pptOptions);
          }
        } else {
          // Traditional mode - process verses in fixed groups
          const versesPerSlide = parseInt(String(pptOptions.versesPerSlide)) || 1;
          for (let i = 0; i < versesToInclude.length; i += versesPerSlide) {
            const slideVerses = versesToInclude.slice(i, i + versesPerSlide);
            createPresentationSlide(pres, slideVerses, searchResults, cleanVerses, pptOptions);
          }
        }
        
        // Helper function to create a presentation slide
        function createPresentationSlide(
          pres: any, 
          verseKeys: string[], 
          searchResults: any, 
          cleanVerses: Record<string, string>, 
          options: any
        ) {
          // Create a new slide
          const slide = pres.addSlide();
          
          // Set background color
          slide.background = { color: options.backgroundColor };
          
          // Add title to the slide (book and chapter reference)
          slide.addText(`${searchResults.book} ${searchResults.chapter}`, {
            x: 0.5,
            y: 0.5,
            w: '90%',
            h: 0.75,
            fontSize: parseInt(options.fontSize.toString()) + 4,
            fontFace: options.font,
            color: options.textColor,
            align: 'center',
            bold: true
          });
          
          // Combine text from selected verses for this slide
          let slideContent = '';
          
          verseKeys.forEach((verseKey, idx) => {
            if (verseKey.startsWith('title-')) {
              // For section titles
              slideContent += `${cleanVerses[verseKey]}\n\n`;
            } else {
              // For regular verses
              slideContent += `${verseKey}. ${cleanVerses[verseKey]}\n\n`;
            }
          });
          
          // Add verse content to the slide (moved 20pt higher)
          slide.addText(slideContent, {
            x: 0.5,
            y: 1.5, // Moved up from 1.5 to 1.3 (approximately 20pt higher)
            w: '90%',
            h: 4,
            fontSize: parseInt(options.fontSize.toString()),
            fontFace: options.font,
            color: options.textColor,
            align: 'center',
            valign: 'middle'
          });
        }
        
        // Save the presentation
        pres.writeFile({ fileName: `${searchResults.book}_${searchResults.chapter}_presentasi.pptx` });
      } else if (type === 'subtitle') {
        // Create a subtitle version of the presentation
        const subtitlePres = new pptxgen();
        
        // Set to 16:9 as requested
        subtitlePres.layout = 'LAYOUT_16x9';
        
        // Process each verse individually to avoid mixing verses across slides
        for (const verseKey of versesToInclude) {
          // Get the clean verse text
          const verseText = cleanVerses[verseKey];
          
          // Skip empty verses
          if (!verseText || verseText.trim() === '') continue;
          
          // Get verse reference to display
          let verseReference = '';
          if (verseKey.startsWith('title-')) {
            // For section titles, don't add a reference
            verseReference = '';
          } else {
            // For regular verses, add chapter:verse
            verseReference = `${searchResults.chapter}:${verseKey} `;
          }
          
          // Prepare complete text with reference
          const completeText = verseReference + verseText;
          
          // Split into words first
          const words = completeText.trim().split(/\s+/);
          const maxCharsPerSlide = parseInt(subtitleOptions.maxChars.toString());
          
          // Process words for this verse
          let currentSlideText = '';
          let currentSlideChars = 0;
          
          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            // Check if adding this word would exceed the character limit
            if (currentSlideChars + word.length + 1 > maxCharsPerSlide && currentSlideText !== '') {
              // Create a slide with current accumulated text
              createSubtitleSlide(
                subtitlePres, 
                currentSlideText.trim(), 
                subtitleOptions
              );
              
              // Reset for next slide
              currentSlideText = word;
              currentSlideChars = word.length;
            } else {
              // Add word to current slide
              if (currentSlideText === '') {
                currentSlideText = word;
              } else {
                currentSlideText += ' ' + word;
              }
              currentSlideChars += word.length + (currentSlideText === word ? 0 : 1);
            }
          }
          
          // Don't forget the last slide if there's text left
          if (currentSlideText.trim() !== '') {
            createSubtitleSlide(
              subtitlePres, 
              currentSlideText.trim(), 
              subtitleOptions
            );
          }
        }
        
        // Helper function to create a subtitle slide with proper types
        function createSubtitleSlide(
          pres: any, 
          text: string, 
          options: { 
            maxChars: number;
            font: string;
            fontSize: number;
            background: string;
            text?: string;  // Make text optional
            textColor?: string; // Make textColor optional
          }
        ) {
          try {
            // Add a new slide
          const slide = pres.addSlide();
          
            // Always use 16:9 aspect ratio for subtitles
            pres.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 });
            
            // Set background color - use the color directly
            slide.background = { color: options.background };
            
            // Add verse content to the slide
          slide.addText(text, {
              x: 0, 
              y: '70%',     // Position from top
              w: '100%',    // Width of textbox
              h: 1.0,       // Height of textbox
            fontSize: parseInt(options.fontSize.toString()),
              fontFace: options.font,
              color: options.textColor || options.text, // Use textColor if available, otherwise fallback to text
            align: 'center',
            valign: 'bottom',
              margin: 10,
              fit: 'shrink'
            });
            
            return slide;
          } catch (error) {
            console.error("Error creating subtitle slide:", error);
            throw error;
          }
        }
        
        // Save the subtitle presentation
        subtitlePres.writeFile({ fileName: `${searchResults.book}_${searchResults.chapter}_subtitle.pptx` });
      }
    } catch (err) {
      console.error('Error generating PowerPoint:', err);
      setError('Terjadi kesalahan saat membuat presentasi PowerPoint.');
    } finally {
      setGeneratingPpt(false);
    }
  };

  return (
    <div className="relative">
      {/* Header sudah tidak diperlukan karena kita sudah memiliki Navbar */}
      
      {/* Search Section with Dropdowns */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white rounded-xl shadow-xl p-6 backdrop-blur-sm bg-white/90" 
               style={{
                 boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                 borderRadius: '16px',
                 border: '1px solid rgba(255, 255, 255, 0.3)'
               }}>
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-indigo-500 to-purple-600 text-transparent bg-clip-text">
              Bible PPT Generator
            </h2>
            
            {/* Error and connection status */}
            {error && (
              <div className="alert alert-error mb-6">
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
            
            {/* Connection status display */}
            {connectionStatus.message && (
              <div className={`alert ${connectionStatus.success ? 'alert-success' : 'alert-warning'} mb-6`}>
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
            
            {/* Bible Version Dropdown */}
            <div className="card bg-base-100 shadow-md mb-6 p-4 border border-base-200">
              <label className="label">
                <span className="label-text font-semibold text-lg">Pilih Versi Alkitab</span>
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
            <form onSubmit={handleDropdownSearch} className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Verse Section */}
                <div className="card bg-base-100 shadow-md p-5 border border-base-200">
                  <h3 className="font-semibold text-lg text-primary mb-4">Ayat Awal</h3>
                  
                  {/* Book Dropdown */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Kitab</span>
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
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Pasal</span>
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
                      <span className="label-text font-medium">Ayat</span>
                    </label>
                    <select 
                      className="select select-bordered w-full" 
                      value={selectedStartVerse}
                      onChange={handleStartVerseChange}
                      disabled={!selectedStartChapter || loading}
                    >
                      <option value="">Pilih Ayat</option>
                      {startVerses
                        .filter(verse => !verse.type || verse.type !== 'title') // Only show actual verses, not section titles
                        .map(verse => (
                          <option key={verse.id} value={verse.id}>{verse.number}</option>
                        ))}
                    </select>
                  </div>
                </div>
                
                {/* End Verse Section */}
                <div className="card bg-base-100 shadow-md p-5 border border-base-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-primary">Ayat Akhir</h3>
                    <div className="form-control">
                      <label className="label cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="checkbox checkbox-primary" 
                          checked={useEndVerse}
                          onChange={handleUseEndVerseChange}
                          disabled={!selectedStartVerse || loading}
                        />
                        <span className="label-text ml-2 font-medium">Gunakan rentang ayat</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* End Chapter Dropdown */}
                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text font-medium">Pasal</span>
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
                      <span className="label-text font-medium">Ayat</span>
                    </label>
                    <select 
                      className="select select-bordered w-full" 
                      value={selectedEndVerse}
                      onChange={handleEndVerseChange}
                      disabled={!useEndVerse || !selectedEndChapter || loading}
                    >
                      <option value="">Pilih Ayat</option>
                      {endVerses
                        .filter(verse => !verse.type || verse.type !== 'title') // Only show actual verses, not section titles
                        .map(verse => (
                          <option key={verse.id} value={verse.id}>{verse.number}</option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Search Button */}
              <div className="mt-6">
                <button 
                  type="submit" 
                  className="btn btn-primary btn-lg w-full" 
                  disabled={!selectedStartVerse || loading || (useEndVerse && !selectedEndVerse)}
                >
                  {loading ? <span className="loading loading-spinner loading-md"></span> : (
                    <div className="flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                      <span>Cari Ayat</span>
                    </div>
                  )}
                </button>
                </div>
            </form>
            
            {/* Search Results Display */}
            {searchResults && (
              <div className="mt-8 border-t border-base-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-primary">
                  {searchResults.book} {searchResults.chapter}
                  {searchResults.type === 'single' && `:${searchResults.verse}`}
                  {searchResults.type === 'range' && `:${searchResults.startVerse}-${searchResults.endVerse}`}
                </h3>
                  
                  <div className="badge badge-lg">{selectedVerses.length} ayat dipilih</div>
                </div>
                
                <div className="grid-container" style={{ height: "calc(100vh - 400px)", minHeight: "500px" }}>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4 h-full">
                    {/* Left column: Verse selection */}
                    <div className="bg-base-100 p-5 rounded-xl shadow-md border border-base-200 flex flex-col h-full">
                      <h4 className="text-lg font-semibold mb-3 text-primary">Daftar Ayat</h4>
                      <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
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
                              className={`mb-3 last:mb-0 ${isTitle ? 'font-bold text-purple-600 mt-4 mb-3' : ''} 
                                ${isHighlighted ? 'bg-[#faf7c3] p-2 rounded-lg' : ''} 
                                flex items-start gap-2 hover:bg-base-200 p-2 rounded-lg transition-colors
                                ${selectedVerses.length === 0 ? 'animate-pulse' : ''}`}
                            >
                              <input
                                type="checkbox"
                                id={`verse-${key}`}
                                className={`checkbox checkbox-primary mt-1 ${selectedVerses.length === 0 ? 'animate-pulse' : ''}`}
                                checked={selectedVerses.includes(key)}
                                onChange={() => handleVerseSelection(key)}
                              />
                              <div>
                                {!isTitle && <span className="font-bold mr-2">{key}</span>}
                                <span dangerouslySetInnerHTML={{ __html: text }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        // Fallback to old behavior
                        Object.entries(searchResults.verses).map(([verseNum, text]) => {
                          // Check if this is a section title
                          const isTitle = verseNum.startsWith('title-');
                          
                          return (
                              <div key={verseNum} className={`mb-3 last:mb-0 ${isTitle ? 'font-bold text-purple-600 mt-4 mb-3' : ''} 
                                hover:bg-base-200 p-2 rounded-lg transition-colors flex items-start gap-2
                                ${selectedVerses.length === 0 ? 'animate-pulse' : ''}`}>
                              <input
                                type="checkbox"
                                id={`verse-${verseNum}`}
                                className={`checkbox checkbox-primary mt-1 ${selectedVerses.length === 0 ? 'animate-pulse' : ''}`}
                                checked={selectedVerses.includes(verseNum)}
                                onChange={() => handleVerseSelection(verseNum)}
                              />
                              <div>
                                {!isTitle && <span className="font-bold mr-2">{verseNum}</span>}
                                <span dangerouslySetInnerHTML={{ __html: text }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Floating Button untuk opsi PPT */}
      <FloatingButton 
        onClick={() => setShowOptionsModal(true)}
        icon="download"
        tooltip="Konfigurasi & Download PPT"
        position="bottom-right"
        color="primary"
        className={selectedVerses.length > 0 ? 'animate-pulse-color' : ''}
      />

      {/* Modal untuk opsi PPT */}
      <Modal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        title="Konfigurasi PowerPoint"
        size="lg"
      >
        <div className="flex mb-4 border-b border-gray-200">
          <button
            className={`flex-1 py-2 px-4 text-center ${selectedTab === 'presentation' ? 'border-b-2 border-indigo-500 text-indigo-700 font-medium' : 'text-gray-500'}`}
            onClick={() => setSelectedTab('presentation')}
          >
            Presentasi
          </button>
          <button
            className={`flex-1 py-2 px-4 text-center ${selectedTab === 'subtitle' ? 'border-b-2 border-indigo-500 text-indigo-700 font-medium' : 'text-gray-500'}`}
            onClick={() => setSelectedTab('subtitle')}
          >
            Subtitle
          </button>
        </div>
        
        {selectedTab === 'presentation' && (
          <div className="space-y-4">
            {/* Ukuran Slide */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Ukuran Slide</span>
              </label>
              <select 
                className="select select-bordered w-full" 
                value={pptOptions.size}
                onChange={(e) => handlePptOptionChange('size', e.target.value)}
              >
                <option value="16:9">Widescreen (16:9)</option>
                <option value="4:3">Standar (4:3)</option>
              </select>
            </div>
            
            {/* Ayat per Slide */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Ayat per Slide</span>
              </label>
              <select 
                className="select select-bordered w-full" 
                value={pptOptions.versesPerSlide}
                onChange={(e) => handlePptOptionChange('versesPerSlide', parseInt(e.target.value))}
              >
                <option value="1">1 ayat per slide</option>
                <option value="2">2 ayat per slide</option>
                <option value="3">3 ayat per slide</option>
                <option value="4">4 ayat per slide</option>
                <option value="5">5 ayat per slide</option>
              </select>
            </div>
            
            {/* Font */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Font</span>
              </label>
              <select 
                className="select select-bordered w-full" 
                value={pptOptions.font}
                onChange={(e) => handlePptOptionChange('font', e.target.value)}
              >
                <option value="Arial">Arial</option>
                <option value="Calibri">Calibri</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Verdana">Verdana</option>
                <option value="Georgia">Georgia</option>
                <option value="Tahoma">Tahoma</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Trebuchet MS">Trebuchet MS</option>
                <option value="Century Gothic">Century Gothic</option>
                <option value="Garamond">Garamond</option>
                <option value="Bookman">Bookman</option>
                <option value="Impact">Impact</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
                <option value="Palatino">Palatino</option>
                <option value="Courier New">Courier New</option>
                <option value="Lucida Sans">Lucida Sans</option>
                <option value="Lucida Console">Lucida Console</option>
              </select>
            </div>
            
            {/* Font Weight */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Ketebalan Font</span>
              </label>
              <select 
                className="select select-bordered w-full" 
                value={pptOptions.fontWeight}
                onChange={(e) => handlePptOptionChange('fontWeight', e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>
            </div>
            
            {/* Font Size */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Ukuran Font</span>
              </label>
              <input 
                type="range" 
                min="12" 
                max="72" 
                value={pptOptions.fontSize} 
                className="range range-primary w-full" 
                step="2" 
                onChange={(e) => handlePptOptionChange('fontSize', parseInt(e.target.value))}
              />
              <div className="w-full flex justify-between text-xs px-0 mt-1">
                <span>12</span>
                <span>24</span>
                <span>36</span>
                <span>48</span>
                <span>60</span>
                <span>72</span>
              </div>
              <div className="text-center mt-1">
                <span className="text-sm badge">{pptOptions.fontSize}pt</span>
              </div>
            </div>
            
            {/* Background Color */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Warna Latar</span>
              </label>
              <div className="flex gap-2">
                <div 
                  className="h-10 w-10 rounded-md border cursor-pointer"
                  style={{ backgroundColor: pptOptions.backgroundColor }}
                  onClick={() => openCentralColorPicker(pptOptions.backgroundColor, color => handlePptOptionChange('backgroundColor', color))}
                ></div>
                <input 
                  type="text" 
                  value={pptOptions.backgroundColor} 
                  onChange={(e) => handlePptOptionChange('backgroundColor', e.target.value)}
                  className="input input-bordered flex-1" 
                />
              </div>
            </div>
            
            {/* Text Color */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Warna Teks</span>
              </label>
              <div className="flex gap-2">
                <div 
                  className="h-10 w-10 rounded-md border cursor-pointer"
                  style={{ backgroundColor: pptOptions.textColor }}
                  onClick={() => openCentralColorPicker(pptOptions.textColor, color => handlePptOptionChange('textColor', color))}
                ></div>
                <input 
                  type="text" 
                  value={pptOptions.textColor} 
                  onChange={(e) => handlePptOptionChange('textColor', e.target.value)}
                  className="input input-bordered flex-1" 
                />
              </div>
            </div>
            
            {/* Border Options */}
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-medium">Gunakan Border</span>
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={pptOptions.hasBorder}
                  onChange={(e) => handlePptOptionChange('hasBorder', e.target.checked)}
                />
              </label>
            </div>
            
            {pptOptions.hasBorder && (
              <>
                {/* Border Color */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Warna Border</span>
                  </label>
                  <div className="flex gap-2">
                    <div 
                      className="h-10 w-10 rounded-md border cursor-pointer"
                      style={{ backgroundColor: pptOptions.borderColor }}
                      onClick={() => openCentralColorPicker(pptOptions.borderColor, color => handlePptOptionChange('borderColor', color))}
                    ></div>
                    <input 
                      type="text" 
                      value={pptOptions.borderColor} 
                      onChange={(e) => handlePptOptionChange('borderColor', e.target.value)}
                      className="input input-bordered flex-1" 
                    />
                  </div>
                </div>
                
                {/* Border Width */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Ketebalan Border</span>
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={pptOptions.borderWidth} 
                    className="range range-primary w-full" 
                    step="1" 
                    onChange={(e) => handlePptOptionChange('borderWidth', parseInt(e.target.value))}
                  />
                  <div className="w-full flex justify-between text-xs px-0 mt-1">
                    <span>1</span>
                    <span>2</span>
                    <span>4</span>
                    <span>6</span>
                    <span>8</span>
                    <span>10</span>
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-sm badge">{pptOptions.borderWidth}px</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {selectedTab === 'subtitle' && (
          <div className="space-y-4">
            {/* Maksimum Karakter per Slide */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Maksimum Karakter per Slide</span>
              </label>
              <input 
                type="number" 
                className="input input-bordered w-full" 
                value={subtitleOptions.maxChars}
                onChange={(e) => handleSubtitleOptionChange('maxChars', parseInt(e.target.value) || 150)}
                min="10"
                max="500"
              />
              <div className="mt-2">
                <input 
                  type="range" 
                  min="10" 
                  max="500" 
                  value={subtitleOptions.maxChars} 
                  className="range range-primary w-full" 
                  step="10" 
                  onChange={(e) => handleSubtitleOptionChange('maxChars', parseInt(e.target.value))}
                />
                <div className="w-full flex justify-between text-xs px-0 mt-1">
                  <span>10</span>
                  <span>150</span>
                  <span>300</span>
                  <span>500</span>
                </div>
              </div>
              <label className="label">
                <span className="label-text-alt text-info">Teks akan dipenggal per kata, tidak per huruf</span>
              </label>
            </div>
            
            {/* Font */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Font</span>
              </label>
              <select 
                className="select select-bordered w-full" 
                value={subtitleOptions.font}
                onChange={(e) => handleSubtitleOptionChange('font', e.target.value)}
              >
                <option value="Arial">Arial</option>
                <option value="Calibri">Calibri</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Verdana">Verdana</option>
                <option value="Tahoma">Tahoma</option>
                <option value="Segoe UI">Segoe UI</option>
                <option value="Segoe UI Black">Segoe UI Black</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
                <option value="Courier New">Courier New</option>
                <option value="Arial Black">Arial Black</option>
                <option value="Impact">Impact</option>
                <option value="Lucida Sans">Lucida Sans</option>
                <option value="Trebuchet MS">Trebuchet MS</option>
                <option value="Garamond">Garamond</option>
                <option value="Book Antiqua">Book Antiqua</option>
                <option value="Palatino Linotype">Palatino Linotype</option>
              </select>
            </div>
            
            {/* Font Size */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Ukuran Font</span>
              </label>
              <input 
                type="number" 
                className="input input-bordered w-full" 
                value={subtitleOptions.fontSize}
                onChange={(e) => handleSubtitleOptionChange('fontSize', parseInt(e.target.value) || 28)}
                min="10"
                max="50"
              />
              <div className="mt-2">
                <input 
                  type="range" 
                  min="10" 
                  max="50" 
                  value={subtitleOptions.fontSize} 
                  className="range range-primary w-full" 
                  step="2" 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSubtitleOptionChange('fontSize', parseInt(e.target.value))}
                />
                <div className="w-full flex justify-between text-xs px-0 mt-1">
                  <span>10pt</span>
                  <span>30pt</span>
                  <span>50pt</span>
                </div>
              </div>
            </div>
            
            {/* Font Weight */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Ketebalan Font</span>
              </label>
              <select 
                className="select select-bordered w-full" 
                value={subtitleOptions.fontWeight}
                onChange={(e) => handleSubtitleOptionChange('fontWeight', e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="bolder">Bolder</option>
                <option value="lighter">Lighter</option>
              </select>
            </div>
            
            {/* Background Color */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Warna Latar</span>
              </label>
              <div className="flex gap-2">
                <div 
                  className="h-10 w-10 rounded-md border cursor-pointer"
                  style={{ backgroundColor: subtitleOptions.background }}
                  onClick={() => openCentralColorPicker(subtitleOptions.background, color => handleSubtitleOptionChange('background', color))}
                ></div>
                <input 
                  type="text" 
                  value={subtitleOptions.background} 
                  onChange={(e) => handleSubtitleOptionChange('background', e.target.value)}
                  className="input input-bordered flex-1" 
                />
              </div>
            </div>
            
            {/* Text Color */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Warna Teks</span>
              </label>
              <div className="flex gap-2">
                <div 
                  className="h-10 w-10 rounded-md border cursor-pointer"
                  style={{ backgroundColor: subtitleOptions.textColor }}
                  onClick={() => openCentralColorPicker(subtitleOptions.textColor, color => handleSubtitleOptionChange('textColor', color))}
                ></div>
                <input 
                  type="text" 
                  value={subtitleOptions.textColor} 
                  onChange={(e) => handleSubtitleOptionChange('textColor', e.target.value)}
                  className="input input-bordered flex-1" 
                />
              </div>
            </div>
            
            {/* Border Options */}
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-medium">Gunakan Border</span>
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary" 
                  checked={subtitleOptions.hasBorder}
                  onChange={(e) => handleSubtitleOptionChange('hasBorder', e.target.checked)}
                />
              </label>
            </div>
            
            {subtitleOptions.hasBorder && (
              <>
                {/* Border Color */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Warna Border</span>
                  </label>
                  <div className="flex gap-2">
                    <div 
                      className="h-10 w-10 rounded-md border cursor-pointer"
                      style={{ backgroundColor: subtitleOptions.borderColor }}
                      onClick={() => openCentralColorPicker(subtitleOptions.borderColor, color => handleSubtitleOptionChange('borderColor', color))}
                    ></div>
                    <input 
                      type="text" 
                      value={subtitleOptions.borderColor} 
                      onChange={(e) => handleSubtitleOptionChange('borderColor', e.target.value)}
                      className="input input-bordered flex-1" 
                    />
                  </div>
                </div>
                
                {/* Border Width */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Ketebalan Border</span>
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={subtitleOptions.borderWidth} 
                    className="range range-primary w-full" 
                    step="1" 
                    onChange={(e) => handleSubtitleOptionChange('borderWidth', parseInt(e.target.value))}
                  />
                  <div className="w-full flex justify-between text-xs px-0 mt-1">
                    <span>1</span>
                    <span>3</span>
                    <span>5</span>
                    <span>7</span>
                    <span>10</span>
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-sm badge">{subtitleOptions.borderWidth}px</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        <div className="flex justify-end mt-6 gap-2">
          <button
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 transition-colors"
            onClick={() => setShowOptionsModal(false)}
          >
            Tutup
          </button>
          <button
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white hover:opacity-90 transition-opacity"
            onClick={() => generatePowerPoint(selectedTab)}
            disabled={generatingPpt || selectedVerses.length === 0}
          >
            {generatingPpt ? 'Membuat PowerPoint...' : 'Buat PowerPoint'}
          </button>
        </div>
      </Modal>
      
      {/* Color Picker Overlay */}
      {centralColorPicker.show && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={closeCentralColorPicker}
        >
          <div 
            className="bg-white p-4 rounded-lg shadow-xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Pilih Warna</h3>
              <button
                className="p-1 rounded-full hover:bg-gray-200"
                onClick={closeCentralColorPicker}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <HexColorPicker
              color={centralColorPicker.color}
              onChange={centralColorPicker.onChange}
            />
            <div className="mt-2 flex items-center gap-2">
              <div 
                className="h-8 w-8 rounded-lg border border-gray-300"
                style={{backgroundColor: centralColorPicker.color}}
              ></div>
              <input
                type="text"
                value={centralColorPicker.color}
                onChange={(e) => centralColorPicker.onChange(e.target.value)}
                className="input input-bordered flex-1"
              />
            </div>
            <button 
              className="btn btn-primary w-full mt-3"
              onClick={closeCentralColorPicker}
            >
              Pilih Warna Ini
            </button>
          </div>
        </div>
      )}
      
      {/* Tambahkan CSS untuk animasi kedip warna */}
      <style jsx global>{`
        @keyframes pulse-color {
          0%, 100% {
            background-color: #6366f1; /* indigo-500 */
            box-shadow: 0 0 15px 5px rgba(99, 102, 241, 0.5);
          }
          50% {
            background-color: #10b981; /* emerald-500 */
            box-shadow: 0 0 15px 5px rgba(16, 185, 129, 0.5);
          }
        }
        .animate-pulse-color {
          animation: pulse-color 2s infinite;
        }
      `}</style>
    </div>
  );
}
