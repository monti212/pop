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

export default HeroSkeleton;
