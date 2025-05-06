'use client'
import React, { useState, useEffect, useRef } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import getDocument from "@/firebase/firestore/getData";
import getSubCollection from "@/firebase/firestore/getSubCollection";
import addSubCollectionDoc from "@/firebase/firestore/addSubCollection";
import deleteSubCollectionDoc from "@/firebase/firestore/deleteSubCollectionDoc";
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Dynamically import CustomQuillEditor to avoid SSR issues
const QuillEditor = dynamic(() => import('@/components/CustomQuillEditor'), { 
  ssr: false,
  loading: () => <div className="h-64 w-full flex items-center justify-center bg-base-300 animate-pulse rounded-lg">Loading editor...</div>
});

// Types
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
  createdAt: string;
  updatedAt: string;
};

type ContentType = 'verse' | 'title';

type BibleVerse = {
  id: string;
  number?: number; // Optional for section titles
  text: string;
  type: ContentType;
  urutan: number; // Order field for sorting all content
  createdAt?: string;
  updatedAt?: string;
};

type PageProps = {
  params: {
    id: string;
    bookId: string;
    chapterId: string;
  };
};

interface Verse {
  id: string;
  number?: number; // Optional for section titles
  text: string;
  type: ContentType;
  urutan: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Chapter {
  id: string;
  number: number;
  verses: Verse[];
}

interface SortableVerseProps {
  verse: Verse;
  onDelete: (id: string) => void;
  onEdit: (verse: Verse) => void;
}

function SortableVerse({ verse, onDelete, onEdit }: SortableVerseProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: verse.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 border rounded-lg ${verse.type === 'title' ? 'bg-blue-50' : 'bg-white'}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>
      <div className="flex-1">
        {verse.type === 'verse' ? (
          <div className="font-semibold">Verse {verse.number}</div>
        ) : (
          <div className="font-semibold text-blue-600">Section Title</div>
        )}
        <div className="text-gray-600" dangerouslySetInnerHTML={{ __html: verse.text }} />
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(verse)}
          className="text-blue-500 hover:text-blue-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(verse.id)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ManageChapterVerses() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext() as { user: any };
  
  // State
  const [book, setBook] = useState<BibleBook | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [versesLoading, setVersesLoading] = useState(true);
  const [addingVerse, setAddingVerse] = useState(false);
  const [editingVerse, setEditingVerse] = useState(false);
  const [deletingVerse, setDeletingVerse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versesError, setVersesError] = useState<string | null>(null);
  const [newVerse, setNewVerse] = useState<Partial<Verse>>({
    number: undefined,
    text: '',
    type: 'verse',
    urutan: 0
  });
  const [contentType, setContentType] = useState<ContentType>('verse');
  const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
  const [showVerseForm, setShowVerseForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [resetEditor, setResetEditor] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auth check
  useEffect(() => {
    if (user == null) router.push("/signin");
  }, [user, router]);

  // Fetch book data
  useEffect(() => {
    async function fetchBook() {
      setLoading(true);
      try {
        const { result, error } = await getDocument('bible', params.id, 'books', params.bookId);
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
  }, [params.id, params.bookId]);

  // Fetch chapter data
  useEffect(() => {
    const fetchChapter = async () => {
      if (!params.id || !params.bookId || !params.chapterId) return;

      console.log('Fetching chapter with params:', {
        bibleId: params.id,
        bookId: params.bookId,
        chapterId: params.chapterId
      });

      try {
        const chapterRef = doc(db, 'bible', params.id as string, 'books', params.bookId as string, 'chapters', params.chapterId as string);
        console.log('Chapter document path:', chapterRef.path);
        
        const chapterDoc = await getDoc(chapterRef);

        if (chapterDoc.exists()) {
          console.log('Chapter document found:', chapterDoc.id);
          const chapterData = chapterDoc.data();
          console.log('Chapter data:', chapterData);
          
          // Fetch verses as subcollection
          const versesCollectionRef = collection(chapterRef, 'verses');
          const versesSnapshot = await getDocs(versesCollectionRef);
          
          const verses: Verse[] = [];
          versesSnapshot.forEach(doc => {
            verses.push({
              id: doc.id,
              ...doc.data() as Omit<Verse, 'id'>,
              // Ensure all documents have type and urutan
              type: doc.data().type || 'verse',
              urutan: doc.data().urutan || (doc.data().number || 0)
            });
          });
          
          console.log('Fetched verses:', verses);
          
          verses.sort((a: Verse, b: Verse) => a.urutan - b.urutan);
          
          setChapter({
            id: chapterDoc.id,
            number: chapterData.number,
            verses
          });
          
          // Also update verses state
          setVerses(verses);
          setVersesLoading(false);
        } else {
          console.error('Chapter document does not exist at path:', chapterRef.path);
          // Create empty chapter if it doesn't exist
          setChapter({
            id: params.chapterId as string,
            number: parseInt(params.chapterId as string),
            verses: []
          });
          setVerses([]);
          setVersesLoading(false);
        }
      } catch (error) {
        console.error('Error fetching chapter:', error);
        setVersesLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchChapter();
  }, [params.id, params.bookId, params.chapterId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!chapter) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapter.verses.findIndex(verse => verse.id === active.id);
    const newIndex = chapter.verses.findIndex(verse => verse.id === over.id);

    const reorderedVerses = arrayMove(chapter.verses, oldIndex, newIndex);
    
    // Update urutan values for all verses
    const updatedVerses = reorderedVerses.map((verse, index) => ({
      ...verse,
      urutan: index + 1,
      updatedAt: new Date().toISOString()
    }));

    try {
      // Update each verse document individually
      const chapterRef = doc(db, 'bible', params.id as string, 'books', params.bookId as string, 'chapters', params.chapterId as string);
      
      // Update each verse in the subcollection
      const promises = updatedVerses.map(verse => {
        const verseRef = doc(chapterRef, 'verses', verse.id);
        return updateDoc(verseRef, {
          urutan: verse.urutan,
          updatedAt: verse.updatedAt
        });
      });
      
      await Promise.all(promises);
      console.log('Updated content order in Firestore');
      
      setChapter({ ...chapter, verses: updatedVerses });
      setVerses(updatedVerses);
    } catch (error) {
      console.error('Error updating content order:', error);
    }
  };

  // Handle editing a verse or section title
  const handleEditVerse = (verse: Verse) => {
    setCurrentVerse(verse);
    setNewVerse({
      number: verse.number,
      text: verse.text || '',
      type: verse.type,
      urutan: verse.urutan
    });
    setContentType(verse.type);
    setIsEditing(true);
    setShowVerseForm(true);
  };

  // Handle deleting a verse or section title
  const handleDeleteVerse = async (verseId: string) => {
    const verseToDelete = verses.find(v => v.id === verseId);
    if (!verseToDelete) return;
    
    const confirmMessage = verseToDelete.type === 'verse' 
      ? `Apakah Anda yakin ingin menghapus ayat ${verseToDelete.number}?`
      : `Apakah Anda yakin ingin menghapus judul perikop?`;
      
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setDeletingVerse(true);
    setCurrentVerse(null);
    
    try {
      const chapterRef = doc(db, 'bible', params.id as string, 'books', params.bookId as string, 'chapters', params.chapterId as string);
      const verseRef = doc(chapterRef, 'verses', verseId);
      await deleteDoc(verseRef);
      
      // Remove verse from state
      setVerses(prev => {
        const filteredVerses = prev.filter(v => v.id !== verseId);
        
        // Update urutan values after deletion
        return filteredVerses.map((verse, index) => ({
          ...verse,
          urutan: index + 1
        }));
      });
      
      // Update chapter state as well
      if (chapter) {
        setChapter(prev => {
          if (!prev) return null;
          const filteredVerses = prev.verses.filter(v => v.id !== verseId);
          
          // Update urutan values after deletion
          return {
            ...prev,
            verses: filteredVerses.map((verse, index) => ({
              ...verse,
              urutan: index + 1
            }))
          };
        });
      }
      
    } catch (err: any) {
      console.error("Error deleting content:", err);
      setVersesError(err.message || "Failed to delete content");
    } finally {
      setDeletingVerse(false);
      setCurrentVerse(null);
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentVerse(null);
    setNewVerse({
      number: undefined,
      text: '',
      type: 'verse',
      urutan: 0
    });
    setContentType('verse');
    setShowVerseForm(false);
  };

  // Handle adding or updating a verse
  const handleSaveVerse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For verses (not section titles), check if a verse with the same number already exists
    if (contentType === 'verse') {
      const existingVerse = verses.find(
        verse => verse.type === 'verse' && 
                verse.number === newVerse.number && 
                (!isEditing || (isEditing && verse.id !== currentVerse?.id))
      );
      
      if (existingVerse) {
        setVersesError(`Ayat dengan nomor ${newVerse.number} sudah ada`);
        return;
      }
    }
    
    // Prepare the verse data with the selected content type
    const verseData = {
      ...newVerse,
      type: contentType,
      // For section titles, ensure number is undefined/null
      number: contentType === 'title' ? null : newVerse.number,
    };
    
    if (isEditing) {
      // Handle editing existing verse or section title
      setEditingVerse(true);
      
      try {
        if (!currentVerse) {
          throw new Error("No content selected for editing");
        }
        
        const updatedVerseData = {
          ...verseData,
          updatedAt: new Date().toISOString(),
        };
        
        const chapterRef = doc(db, 'bible', params.id as string, 'books', params.bookId as string, 'chapters', params.chapterId as string);
        const verseRef = doc(chapterRef, 'verses', currentVerse.id);
        await updateDoc(verseRef, updatedVerseData);
        
        // Update the verse in state
        setVerses(prev => 
          prev.map(verse => 
            verse.id === currentVerse.id 
              ? { 
                ...verse, 
                ...updatedVerseData 
              } as Verse
              : verse
          )
        );
        
        // Also update in chapter state
        if (chapter) {
          setChapter(prev => {
            if (!prev) return null;
            return {
              ...prev,
              verses: prev.verses.map(verse => 
                verse.id === currentVerse.id 
                  ? { 
                    ...verse, 
                    ...updatedVerseData 
                  } as Verse
                  : verse
              )
            };
          });
        }
        
        // Reset form
        setNewVerse({
          number: undefined,
          text: '',
          type: 'verse',
          urutan: 0
        });
        
        // Trigger editor reset
        setResetEditor(prev => !prev);
        
        setIsEditing(false);
        setCurrentVerse(null);
        setShowVerseForm(false);
        setContentType('verse');
        
      } catch (err: any) {
        console.error("Error updating content:", err);
        setVersesError(err.message || "Failed to update content");
      } finally {
        setEditingVerse(false);
      }
    } else {
      // Add new verse or section title
      setAddingVerse(true);
      
      try {
        const verseId = uuidv4();
        
        // Calculate the highest urutan value to position new content at the end
        const highestUrutan = verses.length > 0 
          ? Math.max(...verses.map(v => v.urutan))
          : 0;
          
        const newVerseData = {
          ...verseData,
          id: verseId,
          urutan: highestUrutan + 1, // Place at the end
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user.uid
        };
        
        const chapterRef = doc(db, 'bible', params.id as string, 'books', params.bookId as string, 'chapters', params.chapterId as string);
        const verseRef = doc(chapterRef, 'verses', verseId);
        await setDoc(verseRef, newVerseData);
        
        // Add new verse to state
        const updatedVerses = [...verses, newVerseData as Verse].sort((a, b) => a.urutan - b.urutan);
        setVerses(updatedVerses);
        
        // Also update in chapter state
        if (chapter) {
          setChapter(prev => {
            if (!prev) return null;
            return {
              ...prev,
              verses: [...prev.verses, newVerseData as Verse].sort((a, b) => a.urutan - b.urutan)
            };
          });
        }
        
        // Reset form
        if (contentType === 'verse') {
          // For verses, increment the number for the next entry
          setNewVerse({
            number: (newVerse.number || 0) + 1,
            text: '',
            type: 'verse',
            urutan: 0
          });
        } else {
          // For section titles, reset completely
          setNewVerse({
            number: undefined,
            text: '',
            type: 'verse',
            urutan: 0
          });
          setContentType('verse'); // Reset to verse type
        }
        
        // Trigger editor reset
        setResetEditor(prev => !prev);
        
      } catch (err: any) {
        console.error("Error adding content:", err);
        setVersesError(err.message || "Failed to add content");
      } finally {
        setAddingVerse(false);
      }
    }
  };

  // Handle text change in QuillEditor
  const handleEditorChange = (content: string) => {
    setNewVerse({ ...newVerse, text: content });
  };

  // Auto-suggest next verse number
  const getNextVerseNumber = () => {
    // Filter only verses (not titles) to find the next number
    const onlyVerses = verses.filter(item => item.type === 'verse');
    
    if (onlyVerses.length === 0) return 1;
    
    const maxNumber = Math.max(...onlyVerses.map(verse => verse.number || 0));
    return maxNumber + 1;
  };

  // Initialize new verse number when form is opened
  useEffect(() => {
    if (showVerseForm && !isEditing && contentType === 'verse') {
      setNewVerse(prev => ({
        ...prev,
        number: getNextVerseNumber(),
        type: 'verse'
      }));
    } else if (showVerseForm && !isEditing && contentType === 'title') {
      setNewVerse(prev => ({
        ...prev,
        number: undefined,
        type: 'title'
      }));
    }
  }, [showVerseForm, isEditing, contentType, verses]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!book || !chapter) {
    return <div>Chapter not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Content Type</Label>
              <div className="flex gap-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="verseType"
                    name="contentType"
                    value="verse"
                    checked={contentType === 'verse'}
                    onChange={() => setContentType('verse')}
                    className="mr-2"
                  />
                  <Label htmlFor="verseType">Verse</Label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="titleType"
                    name="contentType"
                    value="title"
                    checked={contentType === 'title'}
                    onChange={() => setContentType('title')}
                    className="mr-2"
                  />
                  <Label htmlFor="titleType">Section Title</Label>
                </div>
              </div>
            </div>
            
            {contentType === 'verse' && (
              <div className="grid gap-2">
                <Label htmlFor="verseNumber">Verse Number</Label>
                <Input
                  id="verseNumber"
                  type="number"
                  value={newVerse.number || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setNewVerse(prev => ({ ...prev, number: parseInt(e.target.value) }))
                  }
                  placeholder="Enter verse number"
                />
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="verseContent">
                {contentType === 'verse' ? 'Verse Content' : 'Section Title'}
              </Label>
              <QuillEditor
                key={resetEditor ? 'reset-editor-1' : 'reset-editor-2'}
                data={newVerse.text || ''}
                onChange={handleEditorChange}
              />
            </div>
            
            <Button 
              onClick={handleSaveVerse} 
              className="flex items-center gap-2"
              disabled={addingVerse || editingVerse}
            >
              <Plus className="w-4 h-4" />
              {isEditing ? 'Update' : 'Add'} {contentType === 'verse' ? 'Verse' : 'Section Title'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chapter Content</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="loading loading-spinner loading-lg"></div>
            </div>
          ) : chapter?.verses && chapter.verses.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={chapter.verses.map(verse => verse.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {chapter.verses.map((verse) => (
                    <SortableVerse
                      key={verse.id}
                      verse={verse}
                      onDelete={handleDeleteVerse}
                      onEdit={handleEditVerse}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center p-8 text-gray-500">
              No content yet. Add verses or section titles above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 