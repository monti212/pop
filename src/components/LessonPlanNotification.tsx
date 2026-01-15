import React from 'react';
import { CheckCircle, FileText, X } from 'lucide-react';

interface LessonPlanNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInUDocs: () => void;
  lessonPlanTitle: string;
}

const LessonPlanNotification: React.FC<LessonPlanNotificationProps> = ({
  isOpen,
  onClose,
  onOpenInUDocs,
  lessonPlanTitle
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-fade-in">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Lesson Plan Created Successfully!
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                Your lesson plan has been saved to U Docs:
              </p>
              <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 mb-4">
                {lessonPlanTitle}
              </p>
              <p className="text-sm text-gray-600">
                Would you like to open it now?
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 rounded-b-lg border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={onOpenInUDocs}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>Open in U Docs</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonPlanNotification;
