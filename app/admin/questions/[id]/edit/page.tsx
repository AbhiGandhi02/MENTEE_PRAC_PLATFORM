'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'; // Import Timestamp
import { db } from '@/lib/firebase/config';
import { Question, CodeLanguage } from '@/lib/types'; // Make sure types include nested content
import { Save, ArrowLeft, AlertCircle, Trash2, Plus, Code, Calculator, Globe } from 'lucide-react'; // Added icons

// Define structure for empty/initial form data (as a fallback)
const initialFormStructure = {
    // Basic fields - these might be overwritten by fetched data, but provide structure
    id: '', // Will be set from fetched data
    subjectId: 'icp' as const, // Default, will be overwritten
    type: 'coding' as const,  // Default, will be overwritten
    order: 1,
    isActive: true,
    deadline: '', // Will hold string for input, populated from fetched data
    createdAt: new Date(), // Placeholder, will be overwritten
    updatedAt: new Date(), // Placeholder, will be overwritten
    createdBy: '', // Placeholder, will be overwritten
    // Content structure with defaults
    content: {
      problemDescription: '',
      constraints: '',
      inputFormat: '',
      outputFormat: '',
      exampleInputs: [''],
      exampleOutputs: [''],
      explanations: [''],
      hiddenTestCases: [{ input: '', expectedOutput: '' }],
      starterCode: {
        python: '',
        javascript: '',
        cpp: '',
        java: '',
      },
      // Add placeholders for other types if needed, or handle dynamically
      // E.g., options: [], correctAnswer: 0, questionText: '', etc.
    },
};


export default function AdminEditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAdmin, loading } = useAuth();
  // State holds the full question being edited, initialized to null
  // Use `any` here to simplify editing across multiple question content union types
  const [formData, setFormData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); // State for error messages

  // --- Auth Guard ---
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, loading, router]);

  // --- Data Fetching ---
  useEffect(() => {
    // Fetch data only if admin, db exists, and an ID is present in URL params
    if (user && isAdmin && db && params.id) {
      loadQuestion();
    } else if (!loading && (user && !isAdmin)) {
      // If loading is done and user is not admin, redirect (safety net)
      router.push('/dashboard');
    }
     // Intentionally not depending on `loadQuestion` to avoid re-running on state changes
  }, [user, isAdmin, params.id, loading, router]); // Added loading/router

  const loadQuestion = async () => {
    const questionId = params.id as string;
    if (!db || !questionId) return;

    // Reset state before loading
    setLoadingData(true);
    setError(null);
    setFormData(null); // Clear previous data

    try {
      const questionDocRef = doc(db, 'questions', questionId);
      const questionDocSnap = await getDoc(questionDocRef);

      if (questionDocSnap.exists()) {
        const questionData = {
          id: questionDocSnap.id,
          ...questionDocSnap.data(),
        } as Question;

        // Format deadline from Timestamp to 'YYYY-MM-DDTHH:mm' string for input
        const deadlineDate = questionData.deadline.toDate();
        // Adjust for local timezone offset before slicing to ensure correct time in input
        const timezoneOffset = deadlineDate.getTimezoneOffset() * 60000; // offset in milliseconds
        const localISOTime = new Date(deadlineDate.getTime() - timezoneOffset).toISOString().slice(0, 16);

        // Initialize formData state with fetched data, ensuring arrays/maps exist
        setFormData({
            ...questionData,
            // Store deadline as string compatible with datetime-local input
            deadline: localISOTime as any, // Cast needed as type expects Timestamp
            // Ensure content arrays/maps exist using fallback, even if empty in DB
            // Merge fetched content with the default structure to ensure all keys exist
            content: {
                ...initialFormStructure.content, // Start with defaults structure
                ...questionData.content, // Overwrite with fetched data
                // Ensure arrays are not undefined/null if optional in DB
                exampleInputs: (questionData.content as any).exampleInputs?.length ? (questionData.content as any).exampleInputs : [''],
                exampleOutputs: (questionData.content as any).exampleOutputs?.length ? (questionData.content as any).exampleOutputs : [''],
                explanations: (questionData.content as any).explanations?.length ? (questionData.content as any).explanations : [''],
                hiddenTestCases: (questionData.content as any).hiddenTestCases?.length ? (questionData.content as any).hiddenTestCases : [{ input: '', expectedOutput: '' }],
                // Ensure starterCode object and keys exist
                starterCode: {
                    ...initialFormStructure.content.starterCode,
              ...((questionData.content as any).starterCode || {}),
                 },
            }
        });
      } else {
        setError('Question not found.');
      }
    } catch (err) {
      console.error('Error loading question:', err);
      setError(`Failed to load question details: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoadingData(false);
    }
  };


  // --- State Update Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!formData) return;
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev: any) => prev ? { ...prev, [name]: checked } : null);
    } else if (type === 'number') {
       // Ensure number conversion doesn't result in NaN, default to 0 or original value
       const numValue = Number(value);
      setFormData((prev: any) => prev ? { ...prev, [name]: isNaN(numValue) ? prev[name] : numValue } : null);
    } else {
      setFormData((prev: any) => prev ? { ...prev, [name]: value } : null);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (!formData) return;
    const { name, value } = e.target;
    setFormData((prev: any) => prev ? {
      ...prev,
      content: { ...prev.content, [name]: value }
    } : null);
  };

  const handleExampleChange = (index: number, field: 'exampleInputs' | 'exampleOutputs' | 'explanations', value: string) => {
     if (!formData) return;
     setFormData((prev: any) => prev ? {
      ...prev,
      content: {
        ...prev.content,
        [field]: (prev.content[field] || []).map((item: any, i: number) => i === index ? value : item)
      }
    } : null);
  };

  const addExample = () => {
    if (!formData) return;
    setFormData((prev: any) => prev ? {
      ...prev,
      content: {
        ...prev.content,
        exampleInputs: [...(prev.content.exampleInputs || []), ''],
        exampleOutputs: [...(prev.content.exampleOutputs || []), ''],
        explanations: [...(prev.content.explanations || []), '']
      }
    } : null);
  };

  const removeExample = (index: number) => {
    if (!formData || !formData.content.exampleInputs || formData.content.exampleInputs.length <= 1) return;
    setFormData((prev: any) => prev ? {
      ...prev,
      content: {
        ...prev.content,
        exampleInputs: prev.content.exampleInputs.filter((_: any, i: number) => i !== index),
        exampleOutputs: prev.content.exampleOutputs.filter((_: any, i: number) => i !== index),
        explanations: prev.content.explanations.filter((_: any, i: number) => i !== index)
      }
    } : null);
  };

  const handleTestCaseChange = (index: number, field: 'input' | 'expectedOutput', value: string) => {
    if (!formData) return;
    setFormData((prev: any) => prev ? {
      ...prev,
      content: {
        ...prev.content,
        hiddenTestCases: (prev.content.hiddenTestCases || []).map((tc: any, i: number) =>
          i === index ? { ...tc, [field]: value } : tc
        )
      }
    } : null);
  };

  const addTestCase = () => {
     if (!formData) return;
     setFormData((prev: any) => prev ? {
      ...prev,
      content: {
        ...prev.content,
        hiddenTestCases: [...(prev.content.hiddenTestCases || []), { input: '', expectedOutput: '' }]
      }
    } : null);
  };

  const removeTestCase = (index: number) => {
    if (!formData || !formData.content.hiddenTestCases || formData.content.hiddenTestCases.length <= 1) return;
    setFormData((prev: any) => prev ? {
      ...prev,
      content: {
        ...prev.content,
        hiddenTestCases: prev.content.hiddenTestCases.filter((_: any, i: number) => i !== index)
      }
    } : null);
  };

  const handleStarterCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!formData) return;
    const { name, value } = e.target;
    setFormData((prev: any) => prev ? {
      ...prev,
      content: {
        ...prev.content,
        starterCode: { ...(prev.content.starterCode || {}), [name]: value }
      }
    } : null);
  };

  // --- Save Handler ---
  const handleSave = async () => {
    if (!formData || !db || !user) {
        setError("Form data or user context is missing. Cannot save.");
        return;
    }

    // --- Validation ---
    if (!formData.deadline) {
      setError("Please ensure the deadline is set.");
      return;
    }
    if (!formData.content.problemDescription?.trim()) { // Check existence before trim
      setError("Problem description cannot be empty.");
      return;
    }
    // Only validate test cases if it's a coding question
    if (formData.type === 'coding') {
        const firstTestCaseValid = formData.content.hiddenTestCases?.length > 0 &&
                                formData.content.hiddenTestCases[0].input.trim() !== '' &&
                                formData.content.hiddenTestCases[0].expectedOutput.trim() !== '';
        if (!firstTestCaseValid) {
            setError("At least one valid hidden test case (with input and output) is required for coding questions.");
            return;
        }
    }
    // --- End Validation ---

    try {
      setSaving(true);
      setError(null);

      // --- Format Data for Firestore ---
      const deadlineDate = new Date(formData.deadline as string); // Deadline is string from input
      if (isNaN(deadlineDate.getTime())) {
        throw new Error("Invalid deadline format.");
      }
      const deadlineTimestamp = Timestamp.fromDate(deadlineDate);

      // Clean arrays based on type before saving
      let cleanExampleInputs: string[] = [];
      let cleanExampleOutputs: string[] = [];
      let cleanExplanations: string[] = [];
      let cleanHiddenTestCases: {input: string; expectedOutput: string}[] = [];

      if (formData.type === 'coding') { // Only clean/validate these for coding type
          cleanExampleInputs = formData.content.exampleInputs?.filter((ex: string) => ex.trim() !== '') || [];
          cleanExampleOutputs = formData.content.exampleOutputs?.slice(0, cleanExampleInputs.length) || [];
          cleanExplanations = formData.content.explanations?.slice(0, cleanExampleInputs.length) || [];
      cleanHiddenTestCases = formData.content.hiddenTestCases?.filter(
        (tc: { input: string; expectedOutput: string }) => tc.input.trim() !== '' && tc.expectedOutput.trim() !== ''
       ) || [];
           if (cleanHiddenTestCases.length === 0) {
               throw new Error("At least one complete hidden test case must be provided for coding questions.");
           }
      }

      // Construct the object with fields to update
      const dataToUpdate: any = { // Use any to avoid strict typing issues with Firestore FieldValue/Timestamp
        order: formData.order,
        isActive: formData.isActive,
        deadline: deadlineTimestamp, // Use Timestamp
        updatedAt: serverTimestamp(), // Update modification time
        // Conditionally update content based on type
        content: {
            ...formData.content, // Spread existing content first
            // Overwrite common/coding fields if present and edited
            problemDescription: formData.content.problemDescription?.trim(),
            // Only include fields relevant to the current type being edited
            ...(formData.type === 'coding' && {
                constraints: formData.content.constraints?.trim(),
                inputFormat: formData.content.inputFormat?.trim(),
                outputFormat: formData.content.outputFormat?.trim(),
                exampleInputs: cleanExampleInputs,
                exampleOutputs: cleanExampleOutputs,
                explanations: cleanExplanations,
                hiddenTestCases: cleanHiddenTestCases,
                starterCode: formData.content.starterCode,
            }),
            // --- Add similar conditional blocks here for Maths/WebDev content fields ---
            // E.g., ...(formData.type === 'mcq' && { options: formData.content.options, ... })
        },
      };
      // --- End Formatting ---

      // --- Update Firestore Document ---
      const questionDocRef = doc(db, 'questions', formData.id);
      await updateDoc(questionDocRef, dataToUpdate);
      // --- End Update ---

      alert('Question updated successfully!');
      router.push('/admin/questions'); // Redirect after success

    } catch (err) {
      console.error('Error updating question:', err);
      setError(`Failed to update question: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  // --- Loading/Error/No Data States ---
  if (loading || loadingData) {
    return (
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
          </div>
        </div>
    );
  }

  if (!isAdmin) { return null; }

  if (error || !formData) {
      return (
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
               <button onClick={() => router.push('/admin/questions')} className="text-purple-600 hover:text-purple-700 font-medium mb-4 inline-flex items-center gap-2">
                 <ArrowLeft className="w-4 h-4" /> Back to Questions
               </button>
               <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                 <div className="flex">
                   <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                   <div className="ml-3">
                     <p className="text-sm text-red-700">{error || "Question data could not be loaded or type is unsupported."}</p>
                   </div>
                 </div>
               </div>
            </main>
          </div>
      );
  }

  // --- Main Form Render ---
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push('/admin/questions')} className="text-purple-600 hover:text-purple-700 font-medium mb-4 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Questions
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Question ({formData.type.toUpperCase()})</h1>
          <p className="text-gray-600">Update question details, content, and settings.</p>
          <code className="mt-1 text-xs text-gray-500 block">ID: {formData.id}</code>
        </div>

        {/* --- FORM START (using div instead of form tag) --- */}
        <div className="space-y-8 bg-white p-8 rounded-xl border-2 border-gray-200 shadow-sm">

          {/* --- Basic Info Section (Always Visible) --- */}
          <div className="space-y-4 border-b border-gray-200 pb-6">
             <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
             {/* Order */}
             <div>
                <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-1">Order *</label>
                <input type="number" name="order" id="order" value={formData.order} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" min="1"/>
             </div>
             {/* Deadline */}
             <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
                <input type="datetime-local" name="deadline" id="deadline" value={formData.deadline as string} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/>
             </div>
             {/* Is Active */}
             <div className="flex items-center gap-2">
                 <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"/>
                 <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Is Active?</label>
             </div>
          </div>

          {/* --- Content Section (Common Part) --- */}
          <div className="space-y-4 border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold text-gray-900">Problem Content</h2>
            {/* Problem Description (Common) */}
            <div>
              <label htmlFor="problemDescription" className="block text-sm font-medium text-gray-700 mb-1">Problem Description *</label>
              <textarea name="problemDescription" id="problemDescription" rows={5} value={formData.content.problemDescription} onChange={handleContentChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"/>
            </div>

            {/* --- Conditionally Render TYPE-SPECIFIC Content Fields --- */}

            {/* Coding Specific Fields */}
            {formData.type === 'coding' && (
               <>
                 <div>
                   <label htmlFor="constraints" className="block text-sm font-medium text-gray-700 mb-1">Constraints</label>
                   <textarea name="constraints" id="constraints" rows={4} value={(formData.content as any).constraints} onChange={handleContentChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"/>
                 </div>
                 <div>
                   <label htmlFor="inputFormat" className="block text-sm font-medium text-gray-700 mb-1">Input Format</label>
                   <textarea name="inputFormat" id="inputFormat" rows={3} value={(formData.content as any).inputFormat} onChange={handleContentChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"/>
                 </div>
                 <div>
                   <label htmlFor="outputFormat" className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
                   <textarea name="outputFormat" id="outputFormat" rows={2} value={(formData.content as any).outputFormat} onChange={handleContentChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"/>
                 </div>
               </>
            )}

            {/* Maths Specific Fields Placeholder */}
            {(formData.type === 'mcq' || formData.type === 'multiple' || formData.type === 'integer' || formData.type === 'string') && (
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                    Maths specific content fields (e.g., Options, Correct Answer, Question Text using LaTeX) would be editable here.
                    <br/><i>(Full editing for this type not yet implemented)</i>
                </div>
            )}

             {/* WebDev Specific Fields Placeholder */}
            {formData.type === 'webdev-debug' && (
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                    Web Dev specific content fields (e.g., Broken HTML/CSS, Requirements, Solution Code) would be editable here.
                    <br/><i>(Full editing for this type not yet implemented)</i>
                </div>
            )}
          </div>


          {/* --- Examples Section (Only for Coding for now) --- */}
          {formData.type === 'coding' && (
            <div className="space-y-4 border-b border-gray-200 pb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Examples</h2>
                  <button type="button" onClick={addExample} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" /> Add Example
                  </button>
                </div>
                {formData.content.exampleInputs.map((input: string, index: number) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700">Example {index + 1}</h3>
                      {formData.content.exampleInputs.length > 1 && (
                        <button type="button" onClick={() => removeExample(index)} className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"> <Trash2 className="w-4 h-4" /> </button>
                      )}
                    </div>
                    {/* Input, Output, Explanation TextAreas */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Input</label>
                      <textarea rows={2} value={input} onChange={(e) => handleExampleChange(index, 'exampleInputs', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Output</label>
                      <textarea rows={1} value={formData.content.exampleOutputs[index] || ''} onChange={(e) => handleExampleChange(index, 'exampleOutputs', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Explanation (Optional)</label>
                      <textarea rows={2} value={formData.content.explanations[index] || ''} onChange={(e) => handleExampleChange(index, 'explanations', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"/>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* --- Hidden Test Cases Section (Coding ONLY) --- */}
          {formData.type === 'coding' && (
            <div className="space-y-4 border-b border-gray-200 pb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Hidden Test Cases *</h2>
                   <button type="button" onClick={addTestCase} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"> <Plus className="w-4 h-4" /> Add Test Case </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 border border-gray-200 rounded-lg p-3">
                  {formData.content.hiddenTestCases.map((testCase: { input: string; expectedOutput: string }, index: number) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">Test Case {index + 1}</h3>
                        {formData.content.hiddenTestCases.length > 1 && (
                          <button type="button" onClick={() => removeTestCase(index)} className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"> <Trash2 className="w-4 h-4" /> </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Input *</label>
                        <textarea rows={2} value={testCase.input} onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)} required={index === 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"/>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Expected Output *</label>
                        <textarea rows={1} value={testCase.expectedOutput} onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)} required={index === 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"/>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          )}

          {/* --- Starter Code Section (Coding ONLY) --- */}
          {formData.type === 'coding' && (
            <div className="space-y-4">
                 <h2 className="text-xl font-semibold text-gray-900">Starter Code (Optional)</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Python */}
                   <div>
                     <label htmlFor="python" className="block text-sm font-medium text-gray-700 mb-1">Python</label>
                     <textarea name="python" id="python" rows={8} value={formData.content.starterCode.python} onChange={handleStarterCodeChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-900 text-gray-200"/>
                   </div>
                   {/* JavaScript */}
                   <div>
                     <label htmlFor="javascript" className="block text-sm font-medium text-gray-700 mb-1">JavaScript</label>
                     <textarea name="javascript" id="javascript" rows={8} value={formData.content.starterCode.javascript} onChange={handleStarterCodeChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-900 text-gray-200"/>
                   </div>
                   {/* C++ */}
                   <div>
                     <label htmlFor="cpp" className="block text-sm font-medium text-gray-700 mb-1">C++</label>
                     <textarea name="cpp" id="cpp" rows={10} value={formData.content.starterCode.cpp} onChange={handleStarterCodeChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-900 text-gray-200"/>
                   </div>
                   {/* Java */}
                   <div>
                     <label htmlFor="java" className="block text-sm font-medium text-gray-700 mb-1">Java</label>
                     <textarea name="java" id="java" rows={10} value={formData.content.starterCode.java} onChange={handleStarterCodeChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-900 text-gray-200"/>
                   </div>
                 </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3"><p className="text-sm text-red-700">{error}</p></div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
            >
              {saving ? (
                 <> <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div> Saving... </>
              ) : (
                <> <Save className="w-5 h-5 mr-2" /> Save Changes </>
              )}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}