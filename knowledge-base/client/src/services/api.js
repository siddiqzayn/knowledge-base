const API_URL = 'http://localhost:5000/api';

// Fetches documents with optional search term
export const fetchDocuments = async (token, searchTerm = '') => {
  const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
  const response = await fetch(`${API_URL}/documents${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch documents.');
  }
  return await response.json();
};

// You can add more API service functions here as needed