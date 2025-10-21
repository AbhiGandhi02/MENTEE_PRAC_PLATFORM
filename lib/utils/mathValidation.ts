import {
  MCQQuestionContent,
  MultipleQuestionContent,
  IntegerQuestionContent,
  StringQuestionContent,
} from '@/lib/types';

export interface ValidationResult {
  isCorrect: boolean;
  explanation: string;
  userAnswer?: any;
  correctAnswer?: any;
}

export function validateMCQ(
  content: MCQQuestionContent,
  selectedOption: number | null
): ValidationResult {
  if (selectedOption === null) {
    return {
      isCorrect: false,
      explanation: 'Please select an answer',
    };
  }

  const isCorrect = selectedOption === content.correctAnswer;

  return {
    isCorrect,
    explanation: content.explanation,
    userAnswer: selectedOption,
    correctAnswer: content.correctAnswer,
  };
}

export function validateMultiple(
  content: MultipleQuestionContent,
  selectedOptions: number[]
): ValidationResult {
  if (selectedOptions.length === 0) {
    return {
      isCorrect: false,
      explanation: 'Please select at least one answer',
    };
  }

  const correctSet = new Set(content.correctAnswers);
  const selectedSet = new Set(selectedOptions);

  const isCorrect =
    correctSet.size === selectedSet.size &&
    [...correctSet].every((item) => selectedSet.has(item));

  return {
    isCorrect,
    explanation: content.explanation,
    userAnswer: selectedOptions.sort(),
    correctAnswer: content.correctAnswers.sort(),
  };
}

export function validateInteger(
  content: IntegerQuestionContent,
  answer: string
): ValidationResult {
  const trimmedAnswer = answer.trim();

  if (trimmedAnswer === '') {
    return {
      isCorrect: false,
      explanation: 'Please enter an answer',
    };
  }

  const numericAnswer = parseFloat(trimmedAnswer);

  if (isNaN(numericAnswer)) {
    return {
      isCorrect: false,
      explanation: 'Please enter a valid number',
    };
  }

  const difference = Math.abs(numericAnswer - content.correctAnswer);
  const isCorrect = difference <= content.tolerance;

  return {
    isCorrect,
    explanation: content.explanation,
    userAnswer: numericAnswer,
    correctAnswer: content.correctAnswer,
  };
}

export function validateString(
  content: StringQuestionContent,
  answer: string
): ValidationResult {
  const trimmedAnswer = answer.trim();

  if (trimmedAnswer === '') {
    return {
      isCorrect: false,
      explanation: 'Please enter an answer',
    };
  }

  let userAnswer = trimmedAnswer;
  let correctAnswer = content.correctAnswer;
  let acceptableAnswers = content.acceptableAnswers || [];

  if (!content.caseSensitive) {
    userAnswer = userAnswer.toLowerCase();
    correctAnswer = correctAnswer.toLowerCase();
    acceptableAnswers = acceptableAnswers.map((a) => a.toLowerCase());
  }

  const isCorrect =
    userAnswer === correctAnswer || acceptableAnswers.includes(userAnswer);

  return {
    isCorrect,
    explanation: content.explanation,
    userAnswer: trimmedAnswer,
    correctAnswer: content.correctAnswer,
  };
}
