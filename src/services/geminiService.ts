// Service for interacting with Google Gemini API for image processing

/**
 * Convert a file to a base64 encoded string
 * @param file The file to convert
 * @returns A promise that resolves to the base64 encoded string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Interface for verses extracted from Gemini API
 */
export interface ExtractedVerse {
  id: string;
  verseNumber: string;
  verseText: string;
}

/**
 * Interface for Bible verse search results from Gemini
 */
export interface BibleVerseSearchResult {
  book: string;     // Book name (e.g., "Matius", "Mat")
  chapter: number;  // Chapter number
  verseStart?: number; // Starting verse (if a range)
  verseEnd?: number;   // Ending verse (if a range)
}

/**
 * Search for Bible verses using Gemini API
 * @param searchQuery The search query (e.g., "Matius 3:1-3" or "Mat 3")
 * @param apiKey Google API key for Gemini
 * @returns A promise that resolves to search results
 */
export const searchBibleVerseWithGemini = async (
  searchQuery: string,
  apiKey: string
): Promise<BibleVerseSearchResult[]> => {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  if (!searchQuery) {
    throw new Error('Search query is required');
  }

  try {
    // Create Gemini API request
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    // Prompt to extract verse references from the search query
    const prompt = `Anda adalah Asisten pencarian ayat Alkitab yang akurat. Pengguna mencari referensi ayat Alkitab. Analisis kueri berikut: "${searchQuery}"
    
    Hasilkan respons dalam format JSON array berikut (tanpa komentar atau text tambahan):
    [
      {
        "book": "nama kitab lengkap",
        "chapter": nomor pasal (angka),
        "verseStart": nomor ayat awal (angka, opsional),
        "verseEnd": nomor ayat akhir (angka, opsional)
      }
    ]

    Aturan:
    1. Jika pengguna hanya menyebutkan kitab dan pasal (mis. "Mat 3"), verseStart dan verseEnd boleh kosong.
    2. Jika pengguna menyebutkan satu ayat (mis. "Mat 3:1"), verseStart dan verseEnd harus sama.
    3. Jika pengguna menyebutkan rentang ayat (mis. "Mat 3:1-3"), verseStart dan verseEnd harus sesuai.
    4. Jika ada singkatan kitab, ubah menjadi nama kitab lengkap (mis. "Mat" → "Matius").
    5. Selalu periksa format penulisan referensi Alkitab yang umum (mis. "Kitab Pasal:Ayat" atau "Kitab Pasal:Ayat-Ayat").
    6. Jika ada ketidakjelasan dalam kueri, kembalikan interpretasi terbaik berdasarkan konvensi referensi Alkitab.
    7. Hanya hasilkan JSON array. Tidak ada teks penjelasan apapun.`;
    
    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    };

    // Send request to Gemini API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Parse the response text
    let responseText = '';
    
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      responseText = data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid Gemini API response format');
    }
    
    // Parse the response to extract Bible verse references
    return parseBibleVerseSearchResponse(responseText);
  } catch (error) {
    console.error('Error in searchBibleVerseWithGemini:', error);
    throw error;
  }
};

/**
 * Parse Gemini API response text to extract Bible verse references
 * @param responseText The text response from Gemini API
 * @returns An array of Bible verse search results
 */
export const parseBibleVerseSearchResponse = (responseText: string): BibleVerseSearchResult[] => {
  try {
    // Try to extract JSON array from response
    const jsonMatch = responseText.match(/\[\s*{[\s\S]*}\s*\]/);
    
    if (jsonMatch) {
      try {
        // Parse JSON array
        const parsedArray = JSON.parse(jsonMatch[0]);
        
        // Validate and map to our expected format
        return parsedArray.map((item: any) => {
          const result: BibleVerseSearchResult = {
            book: item.book || '',
            chapter: parseInt(item.chapter) || 0
          };
          
          if (item.verseStart) {
            result.verseStart = parseInt(item.verseStart) || undefined;
          }
          
          if (item.verseEnd) {
            result.verseEnd = parseInt(item.verseEnd) || undefined;
          }
          
          return result;
        });
      } catch (e) {
        console.warn('Failed to parse JSON from response:', e);
        return [];
      }
    }
    
    // If JSON parsing fails, return empty array
    return [];
  } catch (error) {
    console.error('Error parsing Gemini Bible verse search response:', error);
    return [];
  }
};

/**
 * Extract verses from an image using Gemini Vision API
 * @param imageFile The image file containing Bible verses
 * @param apiKey Google API key for Gemini
 * @returns A promise that resolves to an array of extracted verses
 */
export const extractVersesFromImage = async (
  imageFile: File,
  apiKey: string
): Promise<ExtractedVerse[]> => {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  if (!imageFile) {
    throw new Error('Image file is required');
  }

  try {
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile);

    // Create Gemini API request
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    // Fixed prompt to extract verses
    const prompt = "tolong lihat semua ayat yang terdapat di gambar ini dan buat menjadi array dengan key value , key : 'nomor ayat' -> value : nomor ayat yang terdeteksi ; key: 'isi ayat' -> value : isi ayat yang terdeteksi. periksa dengan baik dan teliti jangan sampai ada yang salah karena pemenggalan kata, dan jangan berhalusinasi.";
    
    const payload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: imageFile.type,
                data: base64Image
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 4096
      }
    };

    // Send request to Gemini API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Parse the response text
    let responseText = '';
    
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      responseText = data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid Gemini API response format');
    }
    
    // Parse the response to extract verses
    return parseGeminiResponse(responseText);
  } catch (error) {
    console.error('Error in extractVersesFromImage:', error);
    throw error;
  }
};

/**
 * Parse Gemini API response text to extract verses
 * @param responseText The text response from Gemini API
 * @returns An array of extracted verses
 */
export const parseGeminiResponse = (responseText: string): ExtractedVerse[] => {
  try {
    // Try to extract JSON array from response
    const extractedVerses: ExtractedVerse[] = [];
    
    // First try to find JSON array in the response
    const jsonMatch = responseText.match(/\[\s*{[\s\S]*}\s*\]/);
    
    if (jsonMatch) {
      try {
        // Parse JSON array
        const parsedArray = JSON.parse(jsonMatch[0]);
        
        // Map to our expected format
        return parsedArray.map((item: any, index: number) => ({
          id: `extracted-${index}`,
          verseNumber: item['nomor ayat'] || item.verseNumber || '',
          verseText: item['isi ayat'] || item.verseText || ''
        }));
      } catch (e) {
        console.warn('Failed to parse JSON from response:', e);
        // Continue to fallback parsing
      }
    }
    
    // Fallback: Try to extract verses using regex patterns
    // Look for patterns like "1: In the beginning..." or "Verse 1: In the beginning..."
    const verseRegex = /(?:verse\s*)?(\d+)\s*[:.-]\s*(.*?)(?=(?:verse\s*)?(?:\d+)\s*[:.-]|$)/gi;
    let match;
    
    while ((match = verseRegex.exec(responseText)) !== null) {
      if (match[1] && match[2]) {
        extractedVerses.push({
          id: `extracted-${extractedVerses.length}`,
          verseNumber: match[1],
          verseText: match[2].trim()
        });
      }
    }
    
    // If both methods failed, try another approach
    if (extractedVerses.length === 0) {
      // Split by lines and look for verse numbers
      const lines = responseText.split('\n');
      let currentVerseNumber = '';
      let currentVerseText = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Check if line starts with a number followed by a separator
        const lineMatch = trimmedLine.match(/^(\d+)[:.)\s-]+(.+)/);
        
        if (lineMatch) {
          // If we already have a verse, save it
          if (currentVerseNumber && currentVerseText) {
            extractedVerses.push({
              id: `extracted-${extractedVerses.length}`,
              verseNumber: currentVerseNumber,
              verseText: currentVerseText.trim()
            });
          }
          
          // Start a new verse
          currentVerseNumber = lineMatch[1];
          currentVerseText = lineMatch[2];
        } else if (currentVerseNumber) {
          // Continue previous verse
          currentVerseText += ' ' + trimmedLine;
        }
      }
      
      // Add the last verse
      if (currentVerseNumber && currentVerseText) {
        extractedVerses.push({
          id: `extracted-${extractedVerses.length}`,
          verseNumber: currentVerseNumber,
          verseText: currentVerseText.trim()
        });
      }
    }
    
    return extractedVerses;
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    return [];
  }
}; 