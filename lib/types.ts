import { Timestamp } from 'firebase/firestore';

export type UserRole = 'mentee' | 'admin';

export interface User {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  role: UserRole;
  createdAt: Timestamp | Date;
  lastLoginAt: Timestamp | Date;
}

export interface Admin {
  uid: string;
  email: string;
  name: string;
  addedAt: Timestamp;
  addedBy: string;
}

export type SubjectId = 'icp' | 'webdev' | 'maths';

export interface Subject {
  id: SubjectId;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
}

export type QuestionType = 'coding' | 'mcq' | 'multiple' | 'integer' | 'string' | 'webdev-debug';

// ICP Coding Question
export interface CodingQuestionContent {
  problemDescription: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  exampleInputs: string[];
  exampleOutputs: string[];
  explanations: string[];
  hiddenTestCases: Array<{
    input: string;
    expectedOutput: string;
  }>;
  starterCode?: {
    python?: string;
    javascript?: string;
    cpp?: string;
    java?: string;
  };
}

// Maths MCQ Question
export interface MCQQuestionContent {
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Maths Multiple Correct Question
export interface MultipleQuestionContent {
  questionText: string;
  options: string[];
  correctAnswers: number[];
  explanation: string;
}

// Maths Integer Question
export interface IntegerQuestionContent {
  questionText: string;
  correctAnswer: number;
  tolerance: number;
  explanation: string;
}

// Maths String Question
export interface StringQuestionContent {
  questionText: string;
  correctAnswer: string;
  caseSensitive: boolean;
  acceptableAnswers: string[];
  explanation: string;
}

// Web Development Debug Question
export interface WebDevDebugQuestionContent {
  title: string;
  description: string;
  brokenHTML: string;
  brokenCSS: string;
  solutionHTML: string;
  solutionCSS: string;
  referenceImageURL?: string; // Optional: Screenshot of expected result
  requirements: string[]; // List of things that need to be fixed
  hints: string[];
  explanation: string;
}

export type QuestionContent = 
  | CodingQuestionContent 
  | MCQQuestionContent 
  | MultipleQuestionContent 
  | IntegerQuestionContent 
  | StringQuestionContent
  | WebDevDebugQuestionContent;

export interface Question {
  id: string;
  subjectId: SubjectId;
  type: QuestionType;
  content: QuestionContent;
  deadline: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  order: number;
}

export type CodeLanguage = 'python' | 'javascript' | 'cpp' | 'java';

export type SubmissionStatus = 'passed' | 'failed' | 'compilation_error' | 'runtime_error' | 'tle';

export interface CodeEvaluationResult {
  status: SubmissionStatus;
  passedTests: number;
  totalTests: number;
  failedTestCase?: {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    testNumber: number;
  } | null;
  error?: string | null;
  executionTime: number;
}

export interface Submission {
  id: string;
  questionId: string;
  userId: string;
  subjectId: SubjectId;
  type: QuestionType;
  submittedCode?: string;
  language?: CodeLanguage;
  submittedAnswer?: any;
  result: CodeEvaluationResult | any;
  submittedAt: Timestamp;
  isPassed: boolean;
  attemptNumber: number;
  timeSpent: number;
}

export interface DashboardStats {
  subjectId: SubjectId;
  pendingCount: number;
  nearestDeadline?: Date;
  completedCount: number;
  totalCount: number;
}
