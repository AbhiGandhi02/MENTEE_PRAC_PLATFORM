'use client';

import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { CodeLanguage } from '@/lib/types';
import { Play, Moon, Sun } from 'lucide-react';

interface CodeEditorProps {
  initialCode?: string;
  value?: string; // controlled value (optional)
  onChange?: (code: string) => void; // controlled change handler (optional)
  language: CodeLanguage;
  onLanguageChange: (language: CodeLanguage) => void;
  onSubmit: (code: string) => void;
  isSubmitting: boolean;
}

const languageOptions: { value: CodeLanguage; label: string; monacoLang: string }[] = [
  { value: 'python', label: 'Python', monacoLang: 'python' },
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { value: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { value: 'java', label: 'Java', monacoLang: 'java' },
];

const defaultCode = {
  python: '# Write your Python code here\n\ndef solution():\n    pass\n',
  javascript: '// Write your JavaScript code here\n\nfunction solution() {\n    \n}\n',
  cpp: '// Write your C++ code here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  java: '// Write your Java code here\n\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n',
};

export default function CodeEditor({
  initialCode,
  value,
  onChange,
  language,
  onLanguageChange,
  onSubmit,
  isSubmitting,
}: CodeEditorProps) {
  const isControlled = typeof value === 'string' && typeof onChange === 'function';
  const [uncontrolledCode, setUncontrolledCode] = useState(initialCode || defaultCode[language]);
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const editorRef = useRef<any>(null);

  // Keep uncontrolled code in sync with initialCode changes only if uncontrolled
  useEffect(() => {
    if (!isControlled && initialCode !== undefined) {
      setUncontrolledCode(initialCode);
    }
  }, [initialCode, isControlled]);

  const handleLanguageChange = (newLanguage: CodeLanguage) => {
    onLanguageChange(newLanguage);
    if (!isControlled && !initialCode) {
      // Reset default code for the new language only in uncontrolled mode
      setUncontrolledCode(defaultCode[newLanguage]);
    }
  };

  const currentCode = isControlled ? (value as string) : uncontrolledCode;

  const handleSubmit = () => {
    if (currentCode && !isSubmitting) {
      onSubmit(currentCode);
    }
  };

  const currentLanguageConfig = languageOptions.find(opt => opt.value === language) || languageOptions[0];

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Language:</label>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as CodeLanguage)}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            disabled={isSubmitting}
          >
            {languageOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title={`Switch to ${theme === 'vs-dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'vs-dark' ? <Sun className="w-5 h-5 text-gray-700" /> : <Moon className="w-5 h-5 text-gray-700" />}
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="monaco-editor-container" style={{ height: '60vh', minHeight: '400px', maxHeight: '600px' }}>
        <Editor
          height="100%"
          language={currentLanguageConfig.monacoLang}
          value={currentCode}
          theme={theme}
          onChange={(val) => {
            const newVal = val || '';
            if (isControlled) {
              onChange && onChange(newVal);
            } else {
              setUncontrolledCode(newVal);
            }
          }}
          onMount={(editor) => { editorRef.current = editor; }}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 16, bottom: 16 },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      {/* Submit Button */}
      <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={!currentCode || isSubmitting}
          className={`w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 btn-active ${
            (!currentCode || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-700 hover:to-blue-800'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              <span>Evaluating...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>Submit Code</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
