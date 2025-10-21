'use client';

import { useRouter } from 'next/navigation';
import { Code, Globe, Calculator, Clock, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { SubjectId } from '@/lib/types';
import { format, formatDistanceToNow, isPast } from 'date-fns';

interface SubjectCardProps {
  subjectId: SubjectId;
  name: string;
  description: string;
  pendingCount: number;
  completedCount: number;
  totalCount: number;
  nearestDeadline?: Date;
  isActive: boolean;
}

const subjectIcons = {
  icp: Code,
  maths: Calculator,
  webdev: Globe,
};

const subjectColors = {
  icp: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hover: 'hover:border-blue-300',
  },
  maths: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    hover: 'hover:border-purple-300',
  },
  webdev: {
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
    hover: 'hover:border-green-300',
  },
};

export default function SubjectCard({
  subjectId,
  name,
  description,
  pendingCount,
  completedCount,
  totalCount,
  nearestDeadline,
  isActive,
}: SubjectCardProps) {
  const router = useRouter();
  const Icon = subjectIcons[subjectId];
  const colors = subjectColors[subjectId];

  const handleClick = () => {
    if (isActive && totalCount > 0) {
      router.push(`/subjects/${subjectId}`);
    }
  };

  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isDeadlinePast = nearestDeadline && isPast(nearestDeadline);

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-2xl border-2 p-6 transition-all duration-300 ${
        isActive && totalCount > 0
          ? `${colors.border} ${colors.hover} cursor-pointer card-hover`
          : 'border-gray-200 opacity-60 cursor-not-allowed'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-md`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {pendingCount > 0 && (
          <span className={`px-3 py-1 ${colors.bg} ${colors.text} text-xs font-semibold rounded-full`}>
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Title and Description */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-1">{name}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {/* Stats */}
      {totalCount > 0 ? (
        <>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">
                <span className="font-semibold text-gray-900">{completedCount}</span> completed
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Circle className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">
                <span className="font-semibold text-gray-900">{totalCount}</span> total
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>Progress</span>
              <span className="font-semibold">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-500 rounded-full`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Deadline */}
          {nearestDeadline && (
            <div
              className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                isDeadlinePast ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <div className="flex-1">
                <p className="text-xs font-medium">
                  {isDeadlinePast ? 'Overdue' : 'Next deadline'}
                </p>
                <p className="font-semibold">{formatDistanceToNow(nearestDeadline, { addSuffix: true })}</p>
              </div>
            </div>
          )}

          {/* Action Button */}
          {isActive && (
            <button
              className={`w-full mt-4 py-2 px-4 bg-gradient-to-r ${colors.gradient} text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 btn-active`}
            >
              <span>Continue Learning</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            {isActive ? 'No questions available yet' : 'Coming Soon'}
          </p>
        </div>
      )}
    </div>
  );
}
