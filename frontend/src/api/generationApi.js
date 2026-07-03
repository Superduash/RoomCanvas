import client from './client';

/**
 * Standardizes errors caught during API queries, 
 * shielding React components from Axios-specific internals.
 */
const normalizeError = (error) => {
  const message = error.response?.data?.detail || error.message || 'An unexpected error occurred';
  const status = error.response?.status || 500;
  return { message, status };
};

export const generateDesign = async (imageFile, style) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('style', style);

    const response = await client.post('/generate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const getHistory = async () => {
  try {
    const response = await client.get('/history');
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const getGeneration = async (id) => {
  try {
    const response = await client.get(`/history/${id}`);
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};

export const selectVariation = async (generationId, variationId) => {
  try {
    const response = await client.post(`/history/${generationId}/select/${variationId}`);
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};
