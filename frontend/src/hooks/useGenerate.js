import { useState, useContext } from 'react';
import { GenerationContext } from '../context/GenerationContext';
import { generateDesign } from '../api/generationApi';

export const useGenerate = () => {
  const { setCurrentResult, setIsGenerating, setError } = useContext(GenerationContext);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [data, setData] = useState(null);

  const generate = async (imageFile, style) => {
    setIsLoading(true);
    setIsGenerating(true);
    setLocalError(null);
    setError(null);
    try {
      const response = await generateDesign(imageFile, style);
      setData(response);
      setCurrentResult(response);
      return response;
    } catch (err) {
      setLocalError(err);
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  return { generate, isLoading, error: localError, data };
};
