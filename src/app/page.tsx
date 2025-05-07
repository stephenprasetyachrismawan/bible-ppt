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
    font: 'Arial'
  });
  
  // Subtitle options
  const [subtitleOptions, setSubtitleOptions] = useState<{
    maxChars: number;
    font: string;
    fontSize: number;
    background: string;
    textColor: string;
  }>({
    maxChars: 150,
    font: 'Arial',
    fontSize: 28,
    background: '#000000',
    textColor: '#FFFFFF'
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
  
  // New tab state
  const [selectedTab, setSelectedTab] = useState<'presentation' | 'subtitle'>('subtitle');
  
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
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-3xl font-bold mb-6 text-center text-primary">Cari Ayat Alkitab</h2>
            
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left column: Verse selection */}
                  <div className="md:col-span-2 bg-base-100 p-5 rounded-xl shadow-md border border-base-200">
                    <h4 className="text-lg font-semibold mb-3 text-primary">Daftar Ayat</h4>
                    <div className="overflow-y-auto max-h-[1000px] pr-2 custom-scrollbar">
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
                                flex items-start gap-2 hover:bg-base-200 p-2 rounded-lg transition-colors`}
                          >
                            <input
                              type="checkbox"
                              id={`verse-${key}`}
                                className="checkbox checkbox-primary mt-1"
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
                              hover:bg-base-200 p-2 rounded-lg transition-colors flex items-start gap-2`}>
                            <input
                              type="checkbox"
                              id={`verse-${verseNum}`}
                                className="checkbox checkbox-primary mt-1"
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
                  
                  {/* Right column: Presentation options */}
                  <div className="bg-base-100 p-5 rounded-xl shadow-md border border-base-200">
                    {/* Use DaisyUI's built-in tabs component */}
                    <div role="tablist" className="tabs tabs-boxed mb-4">
                      <input 
                        type="radio" 
                        name="options_tab" 
                        role="tab" 
                        className="tab" 
                        aria-label="Opsi Presentasi" 
                        checked={selectedTab === 'presentation'}
                        onChange={() => setSelectedTab('presentation')}
                      />
                      <div role="tabpanel" className={`tab-content p-2 ${selectedTab !== 'presentation' ? 'hidden' : ''}`}>
                        <div className="space-y-4">
                      <div className="form-control">
                        <label className="label">
                              <span className="label-text font-medium">Ukuran PPT</span>
                        </label>
                        <select 
                          className="select select-bordered w-full" 
                          value={pptOptions.size}
                          onChange={(e) => handlePptOptionChange('size', e.target.value)}
                        >
                          <option value="16:9">16:9</option>
                          <option value="4:3">4:3</option>
                        </select>
                      </div>
                      
                      <div className="form-control">
                        <label className="label">
                              <span className="label-text font-medium">Maksimum Karakter per Slide</span>
                            </label>
                            <input 
                              type="number" 
                              className="input input-bordered w-full" 
                              value={pptOptions.maxCharsPerSlide || 200}
                              onChange={(e) => handlePptOptionChange('maxCharsPerSlide', parseInt(e.target.value) || 200)}
                              min="50"
                              max="500"
                              disabled={pptOptions.versesPerSlide > 1}
                            />
                            <label className="label">
                              <span className="label-text-alt text-info">
                                {pptOptions.versesPerSlide > 1 
                                  ? "Pengaturan ini hanya berlaku ketika 'Ayat per Slide' diatur ke 1" 
                                  : "Teks akan dipenggal per kata, tidak per huruf"}
                              </span>
                            </label>
                          </div>
                          
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-medium">Ayat per Slide</span>
                        </label>
                        <select 
                          className="select select-bordered w-full" 
                          value={pptOptions.versesPerSlide}
                          onChange={(e) => handlePptOptionChange('versesPerSlide', parseInt(e.target.value, 10))}
                        >
                          {[1, 2, 3, 4, 5].map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                        <label className="label">
                          <span className="label-text-alt text-info">Tentukan berapa banyak ayat yang akan ditampilkan per slide</span>
                        </label>
                      </div>
                      
                      <div className="form-control">
                        <label className="label">
                              <span className="label-text font-medium">Font</span>
                        </label>
                        <select 
                          className="select select-bordered w-full" 
                              value={pptOptions.font || 'Arial'}
                              onChange={(e) => handlePptOptionChange('font', e.target.value)}
                            >
                              <option value="Arial">Arial</option>
                              <option value="Calibri">Calibri</option>
                              <option value="Times New Roman">Times New Roman</option>
                              <option value="Verdana">Verdana</option>
                              <option value="Tahoma">Tahoma</option>
                              <option value="Segoe UI">Segoe UI</option>
                              <option value="Segoe UI Black">Segoe UI Black</option>
                        </select>
                      </div>
                      
                      <div className="form-control">
                        <label className="label">
                              <span className="label-text font-medium">Ukuran Font</span>
                        </label>
                            <input 
                              type="number" 
                              className="input input-bordered w-full" 
                              value={pptOptions.fontSize}
                              onChange={(e) => handlePptOptionChange('fontSize', parseInt(e.target.value) || 24)}
                              min="10"
                              max="50"
                            />
                            <div className="mt-2">
                              <input 
                                type="range" 
                                min="10" 
                                max="50" 
                                value={pptOptions.fontSize} 
                                className="range range-primary" 
                                step="1" 
                                onChange={(e) => handlePptOptionChange('fontSize', parseInt(e.target.value))}
                              />
                              <div className="flex justify-between text-xs px-1">
                                <span>10pt</span>
                                <span>30pt</span>
                                <span>50pt</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text font-medium">Warna Latar</span>
                            </label>
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap gap-2 mb-2">
                                {/* Preset colors */}
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${pptOptions.backgroundColor === '#FFFFFF' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#FFFFFF'}}
                                  onClick={() => handlePptOptionChange('backgroundColor', '#FFFFFF')}
                                  title="Putih"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${pptOptions.backgroundColor === '#000000' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#000000'}}
                                  onClick={() => handlePptOptionChange('backgroundColor', '#000000')}
                                  title="Hitam"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${pptOptions.backgroundColor === '#FF0000' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#FF0000'}}
                                  onClick={() => handlePptOptionChange('backgroundColor', '#FF0000')}
                                  title="Merah"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${pptOptions.backgroundColor === '#00B050' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#00B050'}}
                                  onClick={() => handlePptOptionChange('backgroundColor', '#00B050')}
                                  title="Hijau"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${pptOptions.backgroundColor === '#0000FF' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#0000FF'}}
                                  onClick={() => handlePptOptionChange('backgroundColor', '#0000FF')}
                                  title="Biru"
                                ></div>
                              </div>
                              
                              {/* Current color and picker toggle */}
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-8 w-8 rounded-lg border border-gray-300 cursor-pointer"
                                  style={{backgroundColor: pptOptions.backgroundColor}}
                                  onClick={() => setShowPptBgColorPicker(!showPptBgColorPicker)}
                                ></div>
                                <div className="flex-1">
                                  <button 
                                    type="button" 
                                    className="btn btn-sm btn-outline w-full"
                                    onClick={() => setShowPptBgColorPicker(!showPptBgColorPicker)}
                                  >
                                    {showPptBgColorPicker ? 'Tutup' : 'Pilih Warna Lain'}
                                  </button>
                                </div>
                              </div>
                              
                              {/* Color picker */}
                              {showPptBgColorPicker && (
                                <div className="mt-2">
                                  <HexColorPicker 
                                    color={pptOptions.backgroundColor} 
                                    onChange={(color) => handlePptOptionChange('backgroundColor', color)} 
                                  />
                                </div>
                              )}
                            </div>
                      </div>
                      
                      <div className="form-control">
                        <label className="label">
                              <span className="label-text font-medium">Warna Teks</span>
                        </label>
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap gap-2 mb-2">
                                {/* Preset colors */}
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${pptOptions.textColor === '#000000' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#000000'}}
                                  onClick={() => handlePptOptionChange('textColor', '#000000')}
                                  title="Hitam"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${pptOptions.textColor === '#FFFFFF' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#FFFFFF'}}
                                  onClick={() => handlePptOptionChange('textColor', '#FFFFFF')}
                                  title="Putih"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${pptOptions.textColor === '#FFFF00' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#FFFF00'}}
                                  onClick={() => handlePptOptionChange('textColor', '#FFFF00')}
                                  title="Kuning"
                                ></div>
                              </div>
                              
                              {/* Current color and picker toggle */}
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-8 w-8 rounded-lg border border-gray-300 cursor-pointer"
                                  style={{backgroundColor: pptOptions.textColor}}
                                  onClick={() => setShowPptTextColorPicker(!showPptTextColorPicker)}
                                ></div>
                                <div className="flex-1">
                                  <button 
                                    type="button" 
                                    className="btn btn-sm btn-outline w-full"
                                    onClick={() => setShowPptTextColorPicker(!showPptTextColorPicker)}
                                  >
                                    {showPptTextColorPicker ? 'Tutup' : 'Pilih Warna Lain'}
                                  </button>
                      </div>
                    </div>
                    
                              {/* Color picker */}
                              {showPptTextColorPicker && (
                                <div className="mt-2">
                                  <HexColorPicker 
                                    color={pptOptions.textColor} 
                                    onChange={(color) => handlePptOptionChange('textColor', color)} 
                                  />
                                </div>
                              )}
                            </div>
                    </div>
                    
                          <button 
                            className="btn btn-primary w-full mt-4"
                            onClick={() => generatePowerPoint('presentation')}
                            disabled={selectedVerses.length === 0 || generatingPpt}
                          >
                            {generatingPpt ? (
                              <>
                                <span className="loading loading-spinner loading-md"></span>
                                Membuat Presentasi (Teks di Tengah)
                              </>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
                                </svg>
                                <span>Buat Presentasi (Teks di Tengah)</span>
                              </div>
                            )}
                          </button>
                        </div>
                      </div>

                      <input 
                        type="radio" 
                        name="options_tab" 
                        role="tab" 
                        className="tab" 
                        aria-label="Opsi Subtitle" 
                        checked={selectedTab === 'subtitle'}
                        onChange={() => setSelectedTab('subtitle')}
                      />
                      <div role="tabpanel" className={`tab-content p-2 ${selectedTab !== 'subtitle' ? 'hidden' : ''}`}>
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600 mb-3">Subtitle akan menghasilkan file terpisah dengan teks hanya di bagian bawah slide.</p>
                          
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
                        <label className="label">
                          <span className="label-text-alt text-info">Teks akan dipenggal per kata, tidak per huruf</span>
                        </label>
                      </div>
                      
                      <div className="form-control">
                        <label className="label">
                              <span className="label-text font-medium">Warna Latar</span>
                        </label>
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap gap-2 mb-2">
                                {/* Preset colors */}
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${subtitleOptions.background === '#000000' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#000000'}}
                                  onClick={() => handleSubtitleOptionChange('background', '#000000')}
                                  title="Hitam"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${subtitleOptions.background === '#FFFFFF' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#FFFFFF'}}
                                  onClick={() => handleSubtitleOptionChange('background', '#FFFFFF')}
                                  title="Putih"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${subtitleOptions.background === '#FF0000' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#FF0000'}}
                                  onClick={() => handleSubtitleOptionChange('background', '#FF0000')}
                                  title="Merah"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${subtitleOptions.background === '#00B050' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#00B050'}}
                                  onClick={() => handleSubtitleOptionChange('background', '#00B050')}
                                  title="Hijau"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${subtitleOptions.background === '#0000FF' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#0000FF'}}
                                  onClick={() => handleSubtitleOptionChange('background', '#0000FF')}
                                  title="Biru"
                                ></div>
                              </div>
                              
                              {/* Current color and picker toggle */}
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-8 w-8 rounded-lg border border-gray-300 cursor-pointer"
                                  style={{backgroundColor: subtitleOptions.background}}
                                  onClick={() => setShowSubtitleBgColorPicker(!showSubtitleBgColorPicker)}
                                ></div>
                                <div className="flex-1">
                                  <button 
                                    type="button" 
                                    className="btn btn-sm btn-outline w-full"
                                    onClick={() => setShowSubtitleBgColorPicker(!showSubtitleBgColorPicker)}
                                  >
                                    {showSubtitleBgColorPicker ? 'Tutup' : 'Pilih Warna Lain'}
                                  </button>
                                </div>
                              </div>
                              
                              {/* Color picker */}
                              {showSubtitleBgColorPicker && (
                                <div className="mt-2">
                                  <HexColorPicker 
                                    color={subtitleOptions.background} 
                                    onChange={(color) => handleSubtitleOptionChange('background', color)} 
                                  />
                                </div>
                              )}
                            </div>
                      </div>
                      
                      <div className="form-control">
                        <label className="label">
                              <span className="label-text font-medium">Warna Teks</span>
                            </label>
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap gap-2 mb-2">
                                {/* Preset colors */}
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${subtitleOptions.textColor === '#FFFFFF' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#FFFFFF'}}
                                  onClick={() => handleSubtitleOptionChange('textColor', '#FFFFFF')}
                                  title="Putih"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${subtitleOptions.textColor === '#000000' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#000000'}}
                                  onClick={() => handleSubtitleOptionChange('textColor', '#000000')}
                                  title="Hitam"
                                ></div>
                                <div 
                                  className={`h-8 w-8 rounded-lg border border-gray-300 cursor-pointer ${subtitleOptions.textColor === '#FFFF00' ? 'ring-2 ring-primary' : ''}`}
                                  style={{backgroundColor: '#FFFF00'}}
                                  onClick={() => handleSubtitleOptionChange('textColor', '#FFFF00')}
                                  title="Kuning"
                                ></div>
                              </div>
                              
                              {/* Current color and picker toggle */}
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-8 w-8 rounded-lg border border-gray-300 cursor-pointer"
                                  style={{backgroundColor: subtitleOptions.textColor}}
                                  onClick={() => setShowSubtitleTextColorPicker(!showSubtitleTextColorPicker)}
                                ></div>
                                <div className="flex-1">
                                  <button 
                                    type="button" 
                                    className="btn btn-sm btn-outline w-full"
                                    onClick={() => setShowSubtitleTextColorPicker(!showSubtitleTextColorPicker)}
                                  >
                                    {showSubtitleTextColorPicker ? 'Tutup' : 'Pilih Warna Lain'}
                                  </button>
                                </div>
                              </div>
                              
                              {/* Color picker */}
                              {showSubtitleTextColorPicker && (
                                <div className="mt-2">
                                  <HexColorPicker 
                                    color={subtitleOptions.textColor} 
                                    onChange={(color) => handleSubtitleOptionChange('textColor', color)} 
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
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
                        </select>
                      </div>
                      
                      <div className="form-control">
                        <label className="label">
                              <span className="label-text font-medium">Ukuran Font</span>
                        </label>
                        <input 
                          type="number" 
                          className="input input-bordered w-full" 
                          value={subtitleOptions.fontSize}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSubtitleOptionChange('fontSize', parseInt(e.target.value) || 28)}
                              min="10"
                              max="50"
                            />
                            <div className="mt-2">
                              <input 
                                type="range" 
                                min="10" 
                                max="50" 
                                value={subtitleOptions.fontSize} 
                                className="range range-primary" 
                                step="1" 
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSubtitleOptionChange('fontSize', parseInt(e.target.value))}
                              />
                              <div className="flex justify-between text-xs px-1">
                                <span>10pt</span>
                                <span>30pt</span>
                                <span>50pt</span>
                              </div>
                      </div>
                    </div>
                    
                      <button 
                            className="btn btn-secondary w-full mt-4"
                        onClick={() => generatePowerPoint('subtitle')}
                        disabled={selectedVerses.length === 0 || generatingPpt}
                      >
                        {generatingPpt ? (
                          <>
                                <span className="loading loading-spinner loading-md"></span>
                                Membuat Subtitle (Teks di Bawah)
                              </>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 7.5 16.5-4.125M12 6.75c-2.708 0-5.363.224-7.948.655C2.999 7.58 2.25 8.507 2.25 9.574v9.176A2.25 2.25 0 0 0 4.5 21h15a2.25 2.25 0 0 0 2.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169A48.329 48.329 0 0 0 12 6.75Zm-1.683 6.443-.005.005-.006-.005.006-.005.005.005Zm-.005 2.127-.005-.006.005-.005.005.005-.005.005Zm-2.116-.006-.005.006-.006-.006.005-.005.006.005-.005.005Zm-.005-2.116-.006-.005.006-.005.005.005-.005.005ZM9.255 10.5v.008h-.008V10.5h.008Zm3.249 1.88-.007.004-.003-.007.006-.003.004.006Zm-1.38 5.126-.003-.006.006-.006.004.007-.006.003Zm.007-6.501-.003.006-.007-.003.004-.007.006.004Zm1.37 5.129-.007-.004.004-.006.006.003-.004.007Zm.504-1.877h-.008v-.007h.008v.007ZM9.255 18v.008h-.008V18h.008Zm-3.246-1.87-.007.004L6 16.127l.006-.003.004.006Zm1.366-5.119-.004-.006.006-.004.004.007-.006.003ZM7.38 17.5l-.003.006-.007-.003.004-.007.006.004Zm-1.376-5.116L6 12.38l.003-.007.007.004-.004.007Zm-.5 1.873h-.008v-.007h.008v.007ZM17.25 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Zm0 4.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                                </svg>
                                <span>Buat Subtitle (Teks di Bawah)</span>
                              </div>
                            )}
                      </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Preview section */}
                    {selectedVerses.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-base-200">
                        <div className="tabs tabs-boxed mb-3">
                          <button className="tab tab-active">Preview</button>
                        </div>
                        
                        {/* Show Presentation preview only when presentation tab is active */}
                        {selectedTab === 'presentation' && (
                          <div>
                            <h5 className="font-medium mb-2">Preview Presentasi</h5>
                            <div 
                              className="w-full rounded-lg overflow-hidden flex flex-col shadow-md"
                          style={{ 
                            backgroundColor: pptOptions.backgroundColor,
                                aspectRatio: pptOptions.size === '16:9' ? '16/9' : '4/3',
                                padding: '16px',
                                color: pptOptions.textColor,
                                position: 'relative',
                                minHeight: '220px'
                              }}
                            >
                              {/* Presentation Title */}
                              <div 
                                className="font-bold text-center"
                                style={{
                                  fontSize: `${(parseInt(pptOptions.fontSize.toString()) + 4) / 3}px`,
                                  fontFamily: pptOptions.font,
                                  marginTop: '5%',
                                  marginBottom: '10%'
                                }}
                              >
                                {searchResults.book} {searchResults.chapter}
                              </div>

                              {/* Presentation Content */}
                              <div 
                                className="text-center flex-1 flex flex-col justify-center"
                                style={{
                                  fontSize: `${parseInt(pptOptions.fontSize.toString()) / 3}px`,
                                  fontFamily: pptOptions.font,
                                  paddingBottom: '15%'
                                }}
                              >
                                {(() => {
                                  // If using versesPerSlide = 1 and maxCharsPerSlide, demonstrate character limit
                                  if (parseInt(pptOptions.versesPerSlide.toString()) === 1 && pptOptions.maxCharsPerSlide) {
                                    // Get content for preview
                                    let combinedText = '';
                                    let currentCharCount = 0;
                                    const versesToShow = [];
                                    
                                    for (const verseKey of selectedVerses) {
                                      const verseText = stripHtmlTags(searchResults.verses[verseKey]);
                                      const displayText = verseKey.startsWith('title-') ? 
                                        verseText : 
                                        `${verseKey}. ${verseText}`;
                                      
                                      if (currentCharCount + displayText.length > pptOptions.maxCharsPerSlide) {
                                        break;
                                      }
                                      
                                      versesToShow.push(verseKey);
                                      currentCharCount += displayText.length;
                                    }
                                    
                                    return versesToShow.map(key => (
                                      <div key={`preview-char-${key}`} className="mb-2">
                                {key.startsWith('title-') ? (
                                  <span className="italic">{stripHtmlTags(searchResults.verses[key])}</span>
                                ) : (
                                  <span>{key}. {stripHtmlTags(searchResults.verses[key])}</span>
                                )}
                              </div>
                                    ));
                                  } else {
                                    // Traditional verse count approach
                                    return selectedVerses
                                      .slice(0, parseInt(pptOptions.versesPerSlide.toString()))
                                      .map(key => (
                                        <div key={`preview-${key}`} className="mb-2">
                                          {key.startsWith('title-') ? (
                                            <span className="italic">{stripHtmlTags(searchResults.verses[key])}</span>
                                          ) : (
                                            <span>{key}. {stripHtmlTags(searchResults.verses[key])}</span>
                                          )}
                          </div>
                                      ));
                                  }
                                })()}
                        </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Show Subtitle preview only when subtitle tab is active */}
                        {selectedTab === 'subtitle' && (
                          <div>
                            <h5 className="font-medium mb-2">Preview Subtitle</h5>
                        <div 
                              className="w-full rounded-lg overflow-hidden relative shadow-md"
                          style={{ 
                                backgroundColor: subtitleOptions.background,
                            aspectRatio: '16/9'
                          }}
                        >
                          <div 
                                className="absolute text-center px-4 w-full"
                            style={{
                                  fontSize: `${parseInt(subtitleOptions.fontSize.toString()) / 3}px`,
                                  fontFamily: subtitleOptions.font,
                                  color: subtitleOptions.textColor,
                                  bottom: '10%',
                                  height: '25%',
                                  left: 0,
                                  right: 0,
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center'
                            }}
                          >
                            {(() => {
                              // Get first verse only for preview
                              if (selectedVerses.length === 0) return '';
                              
                              const firstVerseKey = selectedVerses[0];
                              // Add verse reference if it's not a title
                              const verseReference = !firstVerseKey.startsWith('title-') ? 
                                `${searchResults.chapter}:${firstVerseKey} ` : '';
                              
                              const previewVerseText = stripHtmlTags(searchResults.verses[firstVerseKey]);
                              const completeText = verseReference + previewVerseText;
                              
                              // Split into words
                              const words = completeText.trim().split(/\s+/);
                                  const maxChars = subtitleOptions.maxChars;
                              
                              // Add words until we reach the character limit
                              let previewText = '';
                              let charCount = 0;
                              
                              for (const word of words) {
                                if (charCount + word.length + (previewText ? 1 : 0) > maxChars) {
                                  break;
                                }
                                
                                if (previewText === '') {
                                  previewText = word;
                                } else {
                                  previewText += ' ' + word;
                                }
                                
                                charCount += word.length + (previewText === word ? 0 : 1);
                              }
                              
                              return previewText;
                            })()}
                          </div>
                        </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
