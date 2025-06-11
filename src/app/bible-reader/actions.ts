'use server'

import { searchBibleVerseWithGemini, BibleVerseSearchResult } from '@/services/geminiService';
import getSubCollection from '@/firebase/firestore/getSubCollection';
import getDocument from '@/firebase/firestore/getData';

// Interface for Gemini search result with additional UI data
export interface GeminiSearchResult extends BibleVerseSearchResult {
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

/**
 * Search for Bible verses using Gemini API and retrieve corresponding data
 * @param query The search query (e.g., "Matius 3:1-3")
 * @param apiKey Google API key for Gemini
 * @param versionId Bible version ID (e.g., "tb2-indonesia")
 */
export async function searchVerseWithGemini(
  query: string,
  apiKey: string,
  versionId: string
): Promise<{ results: GeminiSearchResult[]; error: string | null }> {
  try {
    if (!query || !apiKey || !versionId) {
      return { 
        results: [], 
        error: 'Query, API key, and Bible version are required' 
      };
    }

    // 1. Use Gemini to parse the search query
    const geminiResults = await searchBibleVerseWithGemini(query, apiKey);
    
    if (!geminiResults || geminiResults.length === 0) {
      return { 
        results: [], 
        error: 'No valid Bible references found in your search query' 
      };
    }

    // 2. Fetch books from the selected Bible version
    const { result: booksResult, error: booksError } = await getSubCollection(
      'bible',
      versionId,
      'books'
    );

    if (booksError || !booksResult) {
      return { 
        results: [], 
        error: `Error fetching Bible books: ${booksError || 'No books found'}` 
      };
    }

    // 3. Process each Gemini result
    const enhancedResults: GeminiSearchResult[] = [];

    for (const geminiResult of geminiResults) {
      try {
        // Find the corresponding book ID
        const book = booksResult.find((b: any) => 
          b.name.toLowerCase() === geminiResult.book.toLowerCase() || 
          (b.shortName && b.shortName.toLowerCase() === geminiResult.book.toLowerCase())
        );

        if (!book) {
          enhancedResults.push({
            ...geminiResult,
            id: `search-${enhancedResults.length}`,
            bookId: undefined,
            chapterId: undefined,
            verses: []
          });
          continue;
        }

        const bookId = book.id;
        const chapterId = geminiResult.chapter.toString();

        // Fetch chapter data
        const { result: chapterData, error: chapterError } = await getDocument(
          'bible',
          versionId,
          'books',
          bookId,
          'chapters',
          chapterId
        );

        if (chapterError || !chapterData) {
          enhancedResults.push({
            ...geminiResult,
            id: `search-${enhancedResults.length}`,
            bookId,
            chapterId,
            verses: []
          });
          continue;
        }

        // Get verses data
        let verses = chapterData.exists() ? chapterData.data().verses || [] : [];
        
        // Filter verses based on verse range if specified
        if (geminiResult.verseStart !== undefined) {
          const start = geminiResult.verseStart;
          const end = geminiResult.verseEnd || start;
          
          verses = verses.filter((verse: any) => 
            verse.type === 'verse' && 
            verse.number >= start && 
            verse.number <= end
          );
        }
        
        // Add to results
        enhancedResults.push({
          ...geminiResult,
          id: `search-${enhancedResults.length}`,
          bookId,
          chapterId,
          verses
        });
      } catch (error) {
        console.error('Error processing search result:', error);
        // Add the gemini result anyway, but without additional data
        enhancedResults.push({
          ...geminiResult,
          id: `search-${enhancedResults.length}`,
          verses: []
        });
      }
    }

    return { results: enhancedResults, error: null };
  } catch (error) {
    console.error('Error in searchVerseWithGemini:', error);
    return { 
      results: [], 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
} 