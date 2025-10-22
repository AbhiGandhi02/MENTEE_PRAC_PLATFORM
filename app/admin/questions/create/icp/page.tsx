'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Code, Save, AlertCircle, Trash2, Plus } from 'lucide-react';
import { Timestamp, collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { db } from '@/lib/firebase/config'; 
// import { CodeLanguage } from '@/lib/types'; 

const initialFormData = {
  subjectId: 'icp' as const,
  type: 'coding' as const,
  order: 1, 
  isActive: true,
  deadline: '', 
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
  },
};

export default function AdminCreateICPPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, loading, router]);

  if (loading) {
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

  if (!isAdmin) {
    return null; 
  }


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) || 0 })); 
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      content: { ...prev.content, [name]: value }
    }));
  };

  const handleExampleChange = (index: number, field: 'exampleInputs' | 'exampleOutputs' | 'explanations', value: string) => {
    setFormData(prev => ({
      ...prev,
      content: {    
        ...prev.content,
        [field]: prev.content[field].map((item, i) => i === index ? value : item)
      }
    }));
  };

  const addExample = () => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        exampleInputs: [...prev.content.exampleInputs, ''],
        exampleOutputs: [...prev.content.exampleOutputs, ''],
        explanations: [...prev.content.explanations, '']
      }
    }));
  };

  const removeExample = (index: number) => {
    if (formData.content.exampleInputs.length <= 1) return; 
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        exampleInputs: prev.content.exampleInputs.filter((_, i) => i !== index),
        exampleOutputs: prev.content.exampleOutputs.filter((_, i) => i !== index),
        explanations: prev.content.explanations.filter((_, i) => i !== index)
      }
    }));
  };

  const handleTestCaseChange = (index: number, field: 'input' | 'expectedOutput', value: string) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        hiddenTestCases: prev.content.hiddenTestCases.map((tc, i) =>
          i === index ? { ...tc, [field]: value } : tc
        )
      }
    }));
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        hiddenTestCases: [...prev.content.hiddenTestCases, { input: '', expectedOutput: '' }]
      }
    }));
  };

  const removeTestCase = (index: number) => {
    if (formData.content.hiddenTestCases.length <= 1) return; 
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        hiddenTestCases: prev.content.hiddenTestCases.filter((_, i) => i !== index)
      }
    }));
  };

  const handleStarterCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        starterCode: { ...prev.content.starterCode, [name]: value }
      }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null); 

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const fileContent = event.target?.result as string;
          if (!fileContent) throw new Error("File is empty.");
          const jsonData = JSON.parse(fileContent);

          setFormData(prev => ({
             ...prev, 
             order: jsonData.order ?? prev.order,
             isActive: jsonData.isActive ?? prev.isActive,
             deadline: jsonData.deadline ? new Date(jsonData.deadline).toISOString().substring(0, 16) : '', // Format for datetime-local
             content: {
               problemDescription: jsonData.content?.problemDescription || '',
               constraints: jsonData.content?.constraints || '',
               inputFormat: jsonData.content?.inputFormat || '',
               outputFormat: jsonData.content?.outputFormat || '',
               exampleInputs: jsonData.content?.exampleInputs?.length ? jsonData.content.exampleInputs : [''],
               exampleOutputs: jsonData.content?.exampleOutputs?.length ? jsonData.content.exampleOutputs : [''],
               explanations: jsonData.content?.explanations?.length ? jsonData.content.explanations : [''],
               hiddenTestCases: jsonData.content?.hiddenTestCases?.length ? jsonData.content.hiddenTestCases : [{ input: '', expectedOutput: '' }],
               starterCode: {
                 python: jsonData.content?.starterCode?.python || '',
                 javascript: jsonData.content?.starterCode?.javascript || '',
                 cpp: jsonData.content?.starterCode?.cpp || '',
                 java: jsonData.content?.starterCode?.java || '',
               },
             }
          }));
          alert("Form pre-filled from JSON file. Please review and submit.");

        } catch (parseError) {
          console.error("Error parsing JSON file:", parseError);
          setError(`Error reading file: ${parseError instanceof Error ? parseError.message : "Invalid JSON format."}`);
          setSelectedFile(null); // Clear invalid file
          setFormData(initialFormData); // Reset form if parsing fails
        }
      };
      reader.onerror = () => {
          setError("Failed to read the file.");
          setSelectedFile(null);
      };
      reader.readAsText(file);

    } else {
      setSelectedFile(null);
      setFormData(initialFormData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setIsSubmitting(true);
    setError(null);

    if (!formData.deadline) {
      setError("Please set a deadline.");
      setIsSubmitting(false);
      return;
    }
    if (!formData.content.problemDescription.trim()) {
      setError("Problem description is required.");
      setIsSubmitting(false);
      return;
    }
    const firstTestCaseValid = formData.content.hiddenTestCases.length > 0 &&
                               formData.content.hiddenTestCases[0].input.trim() !== '' &&
                               formData.content.hiddenTestCases[0].expectedOutput.trim() !== '';

    if (!firstTestCaseValid) {
        setError("At least one valid hidden test case (with both input and output) is required.");
        setIsSubmitting(false);
        return;
    }

    try {
      const deadlineDate = new Date(formData.deadline);
      if (isNaN(deadlineDate.getTime())) {
        throw new Error("Invalid deadline format. Please use the date picker.");
      }
      const deadlineTimestamp = Timestamp.fromDate(deadlineDate);

      const cleanExampleInputs = formData.content.exampleInputs.filter(ex => ex.trim() !== '');
      const cleanExampleOutputs = formData.content.exampleOutputs.slice(0, cleanExampleInputs.length);
      const cleanExplanations = formData.content.explanations.slice(0, cleanExampleInputs.length);

      const cleanHiddenTestCases = formData.content.hiddenTestCases.filter(
            tc => tc.input.trim() !== '' && tc.expectedOutput.trim() !== ''
       );
       if (cleanHiddenTestCases.length === 0) {
           throw new Error("Internal error: No complete hidden test cases found after filtering.");
       }

      const questionData = {
        subjectId: formData.subjectId,
        type: formData.type,
        order: formData.order,
        isActive: formData.isActive,
        deadline: deadlineTimestamp,
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp(), 
        createdBy: user?.uid || 'unknown-admin', 
        content: {
          problemDescription: formData.content.problemDescription.trim(),
          constraints: formData.content.constraints.trim(),
          inputFormat: formData.content.inputFormat.trim(),
          outputFormat: formData.content.outputFormat.trim(),
          exampleInputs: cleanExampleInputs,
          exampleOutputs: cleanExampleOutputs,
          explanations: cleanExplanations,
          hiddenTestCases: cleanHiddenTestCases,
          starterCode: formData.content.starterCode, 
        }
      };

      const docRef = await addDoc(collection(db, 'questions'), questionData);

      alert('Question created successfully!');
      router.push('/admin/questions'); 

    } catch (err) {
      console.error("Error adding question: ", err); 
      setError(err instanceof Error ? err.message : "An unknown error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateAssets = async () => {
    if (!formData.content.problemDescription.trim() ||
        !formData.content.constraints.trim() ||
        !formData.content.inputFormat.trim() ||
        !formData.content.outputFormat.trim() ||
        !formData.content.exampleInputs[0].trim() ||
        !formData.content.exampleOutputs[0].trim()
    ) {
      setError("Please fill in Description, Constraints, I/O Formats, and at least one Example before generating.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-question-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({
          problemDescription: formData.content.problemDescription,
          constraints: formData.content.constraints,
          inputFormat: formData.content.inputFormat,
          outputFormat: formData.content.outputFormat,
          exampleInputs: formData.content.exampleInputs.filter(ex => ex.trim()),
          exampleOutputs: formData.content.exampleOutputs.filter(ex => ex.trim()),
          explanations: formData.content.explanations.filter(ex => ex.trim()),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.statusText}`);
      }

      const generatedData = await response.json();

      setFormData(prev => ({
        ...prev,
        content: {
          ...prev.content,
          starterCode: generatedData.starterCode || prev.content.starterCode,
          hiddenTestCases: generatedData.hiddenTestCases && generatedData.hiddenTestCases.length > 0
                           ? generatedData.hiddenTestCases
                           : prev.content.hiddenTestCases, 
        }
      }));

      alert("Starter code and test cases generated successfully! Please review.");

    } catch (err) {
      console.error("Error generating assets:", err);
      setError(err instanceof Error ? err.message : "Failed to generate assets.");
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/questions/create')}
            className="text-purple-600 hover:text-purple-700 font-medium mb-4"
          >
            ← Back to Question Types
          </button>
          <div className="flex items-center gap-3 mb-2">
             <Code className="w-8 h-8 text-blue-600" />
             <h1 className="text-3xl font-bold text-gray-900">Create ICP Question</h1>
          </div>
          <p className="text-gray-600">Fill in the details for the new coding problem.</p>
        </div>

        {/* --- FORM START --- */}
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl border-2 border-gray-200 shadow-sm">

            {/* === ADD FILE UPLOAD SECTION START === */}
          <div className="space-y-4 border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold text-gray-900">Upload Question File (Optional)</h2>
            <p className="text-sm text-gray-500">
              Upload a JSON file containing the question data to pre-fill the form.
              Ensure the JSON structure matches the required format (see samples below).
            </p>
            <div>
              <label htmlFor="questionFile" className="block text-sm font-medium text-gray-700 mb-1">
                Select JSON File
              </label>
              <input
                type="file"
                name="questionFile"
                id="questionFile"
                accept=".json" // Only accept JSON files
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-green-600">
                  Selected file: {selectedFile.name} (Form pre-filled, please review)
                </p>
              )}
            </div>
          </div>

          {/* --- Basic Info Section --- */}
          <div className="space-y-4 border-b border-gray-200 pb-6">
             <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
             {/* Order */}
             <div>
                <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-1">Order *</label>
                <input
                    type="number"
                    name="order"
                    id="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    min="1"
                />
                <p className="text-xs text-gray-500 mt-1">Determines the sequence in which questions appear.</p>
             </div>
             {/* Deadline */}
             <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
                <input
                    type="datetime-local"
                    name="deadline"
                    id="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
             </div>
             {/* Is Active */}
             <div className="flex items-center gap-2">
                 <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange} 
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                 />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Is Active?</label>
                <p className="text-xs text-gray-500">(Mentees can only see active questions)</p>
             </div>
          </div>

           {/* --- Content Section --- */}
          <div className="space-y-4 border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold text-gray-900">Problem Content</h2>
            {/* Problem Description */}
            <div>
              <label htmlFor="problemDescription" className="block text-sm font-medium text-gray-700 mb-1">Problem Description *</label>
              <textarea
                name="problemDescription" 
                id="problemDescription"
                rows={5}
                value={formData.content.problemDescription}
                onChange={handleContentChange} 
                required
                placeholder="Given an array of integers, find the sum..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>
            {/* Constraints */}
            <div>
              <label htmlFor="constraints" className="block text-sm font-medium text-gray-700 mb-1">Constraints</label>
              <textarea
                name="constraints"
                id="constraints"
                rows={4}
                value={formData.content.constraints}
                onChange={handleContentChange}
                placeholder="• 1 <= n <= 10^5&#10;• -10^9 <= arr[i] <= 10^9"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
            </div>
             {/* Input Format */}
             <div>
               <label htmlFor="inputFormat" className="block text-sm font-medium text-gray-700 mb-1">Input Format</label>
               <textarea
                 name="inputFormat"
                 id="inputFormat"
                 rows={3}
                 value={formData.content.inputFormat}
                 onChange={handleContentChange}
                 placeholder="First line: integer n&#10;Second line: n space-separated integers"
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
               />
             </div>
             {/* Output Format */}
             <div>
               <label htmlFor="outputFormat" className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
               <textarea
                 name="outputFormat"
                 id="outputFormat"
                 rows={2}
                 value={formData.content.outputFormat}
                 onChange={handleContentChange}
                 placeholder="Print a single integer - the sum of all elements"
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
               />
             </div>
          </div>


          {/* --- Examples Section --- */}
          <div className="space-y-4 border-b border-gray-200 pb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Examples</h2>
                <button
                  type="button"
                  onClick={addExample}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Example
                </button>
              </div>
              <p className="text-sm text-gray-500">Add at least one example to help students understand.</p>

              {formData.content.exampleInputs.map((input, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50/50"> {/* Slightly different bg */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Example {index + 1}</h3>
                    {formData.content.exampleInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExample(index)}
                        className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Example Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Input</label>
                    <textarea
                      rows={2}
                      value={input}
                      onChange={(e) => handleExampleChange(index, 'exampleInputs', e.target.value)}
                      placeholder="5&#10;1 2 3 4 5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                  {/* Example Output */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Output</label>
                    <textarea
                      rows={1}
                      value={formData.content.exampleOutputs[index] || ''}
                      onChange={(e) => handleExampleChange(index, 'exampleOutputs', e.target.value)}
                      placeholder="15"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                  {/* Example Explanation */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Explanation (Optional)</label>
                    <textarea
                      rows={2}
                      value={formData.content.explanations[index] || ''}
                      onChange={(e) => handleExampleChange(index, 'explanations', e.target.value)}
                      placeholder="Sum = 1+2+3+4+5 = 15"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              ))}
            {/* === ADD GENERATE BUTTON HERE === */}
            <div className="pt-6 border-t border-gray-200">
                <button
                    type="button" 
                    onClick={handleGenerateAssets}
                    disabled={isGenerating}
                    className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                >
                    {isGenerating ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                            <span>Generating...</span>
                        </>
                    ) : (
                        '✨ Generate Starter Code & Test Cases with AI'
                    )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    Ensure Description, Constraints, I/O Formats, and Examples are filled before generating. Review generated content carefully.
                    <br />
                    If any of the fields are missing or incomplete, generation process will not start.
                    <br /> 
                    AI-generated content may require adjustments for accuracy and relevance.
                </p>
            </div>
          </div>


          {/* --- Hidden Test Cases Section --- */}
          <div className="space-y-4 border-b border-gray-200 pb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Hidden Test Cases *</h2>
                 <button
                   type="button"
                   onClick={addTestCase}
                   className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                 >
                   <Plus className="w-4 h-4" /> Add Test Case
                 </button>
              </div>
              <p className="text-sm text-gray-500">Add at least one test case. 20 recommended for thorough testing.</p>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-2 border border-gray-200 rounded-lg p-3"> {/* Added scroll container */}
                {formData.content.hiddenTestCases.map((testCase, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700">Test Case {index + 1}</h3>
                      {formData.content.hiddenTestCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTestCase(index)}
                          className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {/* Test Case Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Input *</label>
                      <textarea
                        rows={2}
                        value={testCase.input}
                        onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                        placeholder="5&#10;1 2 3 4 5"
                        required={index === 0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      />
                    </div>
                    {/* Test Case Output */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Expected Output *</label>
                      <textarea
                        rows={1}
                        value={testCase.expectedOutput}
                        onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                        placeholder="15"
                        required={index === 0} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
          </div>

          {/* --- Starter Code Section --- */}
          <div className="space-y-4">
               <h2 className="text-xl font-semibold text-gray-900">Starter Code (Optional)</h2>
               <p className="text-sm text-gray-500">Provide starter code templates.</p>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Grid layout */}
                 {/* Python */}
                 <div>
                   <label htmlFor="python" className="block text-sm font-medium text-gray-700 mb-1">Python</label>
                   <textarea
                     name="python"
                     id="python"
                     rows={8}
                     value={formData.content.starterCode.python}
                     onChange={handleStarterCodeChange}
                     placeholder={`from typing import List\n\nclass Solution:\n    def solve(self, ...) -> ...:\n        # Your code here\n        pass`}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-900 text-gray-200"
                   />
                 </div>
                 {/* JavaScript */}
                 <div>
                   <label htmlFor="javascript" className="block text-sm font-medium text-gray-700 mb-1">JavaScript</label>
                   <textarea
                     name="javascript"
                     id="javascript"
                     rows={8}
                     value={formData.content.starterCode.javascript}
                     onChange={handleStarterCodeChange}
                     placeholder={`/**\n * @param {...} ... \n * @return {...}\n */\nvar solve = function(...) {\n    // Your code here\n};`}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-900 text-gray-200"
                   />
                 </div>
                 {/* C++ */}
                 <div>
                   <label htmlFor="cpp" className="block text-sm font-medium text-gray-700 mb-1">C++</label>
                   <textarea
                     name="cpp"
                     id="cpp"
                     rows={10}
                     value={formData.content.starterCode.cpp}
                     onChange={handleStarterCodeChange}
                     placeholder={`#include <vector>\n\nclass Solution {\npublic:\n    ... solve(...) {\n        // Your code here\n    }\n};`}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-900 text-gray-200"
                   />
                 </div>
                 {/* Java */}
                 <div>
                   <label htmlFor="java" className="block text-sm font-medium text-gray-700 mb-1">Java</label>
                   <textarea
                     name="java"
                     id="java"
                     rows={10}
                     value={formData.content.starterCode.java}
                     onChange={handleStarterCodeChange}
                     placeholder={`import java.util.*;\n\nclass Solution {\n    public ... solve(...) {\n        // Your code here\n    }\n}`}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-900 text-gray-200"
                   />
                 </div>
               </div>
          </div>

          {/* --- Error Message --- */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* --- Submit Button --- */}
          <div className="pt-6 border-t border-gray-200">
            <button
              type="submit" 
              disabled={isSubmitting}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
            >
              {isSubmitting ? (
                 <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    <span>Saving...</span>
                 </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Create Question
                </>
              )}
            </button>
          </div>

        </form> {/* FORM END */}
      </main>
    </div>
  );
}