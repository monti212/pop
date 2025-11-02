import React from 'react';

export const HeroSkeleton: React.FC = () => {
  return (
    <section className="min-h-[100svh] relative overflow-hidden bg-gradient-to-b from-sand-100 to-sand-200">
      <div className="container mx-auto px-4 sm:px-6 h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="flex flex-col justify-center items-center text-center max-w-4xl px-4 space-y-6">
            <div className="w-full max-w-3xl h-16 bg-sand-300 rounded-lg animate-pulse"></div>
            <div className="w-full max-w-2xl h-12 bg-sand-300 rounded-lg animate-pulse"></div>
            <div className="w-full max-w-2xl h-14 bg-white rounded-2xl shadow-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-sand-200 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal"></div>
    </div>
  );
};

export const ConversationListSkeleton: React.FC = () => {
  return (
    <div className="space-y-2 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 animate-pulse">
          <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MessagesSkeleton: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] rounded-2xl p-4 animate-pulse ${
            i % 2 === 0 ? 'bg-teal/20' : 'bg-gray-200'
          }`}>
            <div className="space-y-2">
              <div className="h-4 bg-gray-400 rounded w-full"></div>
              <div className="h-4 bg-gray-400 rounded w-5/6"></div>
              <div className="h-4 bg-gray-400 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const FilesBrowserSkeleton: React.FC = () => {
  return (
    <div className="p-4 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 animate-pulse">
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            <div className="h-2 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const DocumentListSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="space-y-3">
            <div className="h-6 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="flex justify-between items-center pt-2">
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              <div className="h-8 w-20 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ClassListSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="w-8 h-8 bg-gray-300 rounded"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-12 bg-gray-300 rounded-lg"></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 bg-gray-200 rounded-lg"></div>
                <div className="h-10 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HeroSkeleton;
