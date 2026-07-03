import React, { createContext, useState } from 'react';

export const GenerationContext = createContext();

export const GenerationProvider = ({ children }) => {
  const [currentUpload, setCurrentUpload] = useState(null); // File object or preview url
  const [currentResult, setCurrentResult] = useState(null); // Output from generate API
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const resetState = () => {
    setCurrentUpload(null);
    setCurrentResult(null);
    setIsGenerating(false);
    setError(null);
  };

  return (
    <GenerationContext.Provider
      value={{
        currentUpload,
        setCurrentUpload,
        currentResult,
        setCurrentResult,
        isGenerating,
        setIsGenerating,
        error,
        setError,
        resetState
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
};
