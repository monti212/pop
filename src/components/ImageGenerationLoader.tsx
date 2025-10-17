import React from 'react';

interface ImageGenerationLoaderProps {
  modelVersion: '2.0' | '2.1';
}

const ImageGenerationLoader: React.FC<ImageGenerationLoaderProps> = ({ modelVersion }) => {
  const getText = () => {
    return modelVersion === '2.1' ? 'Polymath is creating' : 'Uhuru is creating';
  };

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] ml-2">
        <div className="bg-white rounded-xl rounded-bl-sm px-6 py-4 border border-borders shadow-sm">
          <div className="metallic-shimmer-text-slow text-base sm:text-lg font-bold">
            {getText()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerationLoader;
