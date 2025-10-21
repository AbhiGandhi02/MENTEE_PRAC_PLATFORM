'use client';

import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, Circle, Code, ListChecks, Hash, Type, HelpCircle } from 'lucide-react';
import { Question, SubjectId } from '@/lib/types';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface QuestionCardProps {
  question: Question;
  isCompleted: boolean;
  subjectId: SubjectId;
}

const questionTypeIcons: Record<string, any> = {
  coding: Code,
  mcq: Circle,
  multiple: ListChecks,
  integer: Hash,
  integer_input: Hash,
  string: Type,
  string_input: Type,
};

const questionTypeLabels: Record<string, string> = {
  coding: 'Coding',
  mcq: 'Single Choice',
  multiple: 'Multiple Choice',
  integer: 'Integer Answer',
  integer_input: 'Integer Answer',
  string: 'Text Answer',
  string_input: 'Text Answer',
};

export default function QuestionCard({ question, isCompleted, subjectId }: QuestionCardProps) {
  const router = useRouter();
  const Icon = questionTypeIcons[question.type] || HelpCircle;
  const deadline = question.deadline instanceof Timestamp ? question.deadline.toDate() : question.deadline;
  const isDeadlinePast = isPast(deadline);

  const handleClick = () => {
    router.push(`/subjects/${subjectId}/${question.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 p-6 cursor-pointer card-hover transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isCompleted 
              ? 'bg-green-50 text-green-600' 
              : isDeadlinePast 
              ? 'bg-red-50 text-red-600' 
              : 'bg-blue-50 text-blue-600'
          }`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {questionTypeLabels[question.type]}
            </span>
            <p className="text-sm text-gray-600 mt-0.5">Question #{question.order}</p>
          </div>
        </div>
        
        {isCompleted && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold">Completed</span>
          </div>
        )}
      </div>

      {/* Question Title/Preview */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {question.type === 'coding' 
            ? (question.content as any).problemDescription.split('\n')[0] 
            : (question.content as any).questionText.split('$')[0].trim().substring(0, 100)}
        </h3>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className={`flex items-center gap-2 text-sm ${
          isDeadlinePast ? 'text-red-600' : 'text-gray-600'
        }`}>
          <Clock className="w-4 h-4" />
          <span className="font-medium">
            {isDeadlinePast ? 'Overdue' : formatDistanceToNow(deadline, { addSuffix: true })}
          </span>
        </div>

        <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          {isCompleted ? 'Review' : 'Solve'}
        </button>
      </div>
    </div>
  );
}
