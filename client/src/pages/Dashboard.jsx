import React, { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext, MessageContext } from '../context/AuthContext.jsx';
import { fetchDocuments } from '../services/api.js';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const { token, logout, user } = useContext(AuthContext);
  const { showMessage } = useContext(MessageContext);
  const [ownedDocs, setOwnedDocs] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocVisibility, setNewDocVisibility] = useState('private');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [creatingDoc, setCreatingDoc] = useState(false);
  const navigate = useNavigate();

  const loadDocs = useCallback(async () => {
    if (!token) {
      navigate('/');
      return;
    }
    try {
      setLoading(true);
      const data = await fetchDocuments(token, searchTerm);
      setOwnedDocs(data.owned || []);
      setSharedDocs(data.shared || []);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Failed to load documents:", err);
      setError("Failed to load documents. Please try logging in again.");
      showMessage("Failed to load documents.", "error");
      if (err.response && (err.response.status === 403 || err.response.status === 401)) {
        logout(); // Automatically log out if token is invalid/expired
      }
    } finally {
      setLoading(false);
    }
  }, [token, searchTerm, navigate, logout, showMessage]);

  useEffect(() => {
    // Debounce the search term to avoid excessive API calls
    const handler = setTimeout(() => {
      loadDocs();
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, loadDocs]); // Depend on loadDocs now that it's memoized

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!newDocTitle.trim()) {
      showMessage('Document title cannot be empty.', 'warning');
      return;
    }
    setCreatingDoc(true);
    try {
      await axios.post('http://localhost:5000/api/documents',
        { title: newDocTitle, content: '', visibility: newDocVisibility },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewDocTitle(''); // Clear input
      setNewDocVisibility('private');
      showMessage('Document created successfully!', 'success');
      loadDocs(); // Reload documents
    } catch (err) {
      console.error("Failed to create document:", err);
      showMessage(err.response?.data?.error || 'Failed to create document.', 'error');
    } finally {
      setCreatingDoc(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    showMessage('Logged out successfully.', 'info');
  };

  if (loading) return <div className="p-8 text-center text-gray-600 text-xl font-medium">Loading documents...</div>;
  if (error) return <div className="p-8 text-center text-red-600 text-xl font-medium">{error}</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 sm:mb-0">Knowledge Hub 📚</h1>
        <div className="flex items-center space-x-4">
          {user && (
            <span className="text-gray-700 text-lg font-medium">Welcome, {user.email.split('@')[0]}!</span>
          )}
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg transform hover:scale-105 font-semibold"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-8 bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <input
          type="text"
          placeholder="Search documents by title or content..."
          className="border border-gray-300 p-3 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Create New Document Section */}
      <div className="bg-white p-8 rounded-xl shadow-md mb-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-5 text-gray-800">Create New Document</h2>
        <form onSubmit={handleCreateDocument} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label htmlFor="newDocTitle" className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
            <input
              type="text"
              id="newDocTitle"
              placeholder="e.g., Project Proposal Q3"
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              required
              disabled={creatingDoc}
            />
          </div>
          <div>
            <label htmlFor="newDocVisibility" className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
            <select
              id="newDocVisibility"
              className="border border-gray-300 p-3 w-full rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none bg-white"
              value={newDocVisibility}
              onChange={(e) => setNewDocVisibility(e.target.value)}
              disabled={creatingDoc}
            >
              <option value="private">Private (Only you & shared users)</option>
              <option value="public">Public (Anyone with link)</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="bg-green-600 text-white p-3 w-full rounded-lg font-semibold text-lg hover:bg-green-700 transition-all duration-200 shadow-md transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={creatingDoc}
            >
              {creatingDoc ? 'Creating...' : 'Create Document'}
            </button>
          </div>
        </form>
      </div>

      {/* My Owned Documents */}
      {ownedDocs.length > 0 && (
        <div className="bg-white p-8 rounded-xl shadow-md mb-8 border border-gray-200">
          <h2 className="text-2xl font-bold mb-5 text-gray-800">My Owned Documents</h2>
          <ul className="space-y-4">
            {ownedDocs.map((doc) => (
              <li
                key={doc.id}
                className="border border-gray-200 p-4 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center transform hover:scale-[1.01] shadow-sm hover:shadow-md"
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <div>
                  <strong className="text-xl text-gray-800">{doc.title}</strong>
                  <span className={`ml-3 px-3 py-1 text-xs font-semibold rounded-full ${doc.visibility === 'public' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {doc.visibility}
                  </span>
                </div>
                <span className="text-sm text-gray-500 mt-2 sm:mt-0">
                  Last updated: {new Date(doc.updated_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Documents Shared With Me */}
      {sharedDocs.length > 0 && (
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
          <h2 className="text-2xl font-bold mb-5 text-gray-800">Documents Shared With Me</h2>
          <ul className="space-y-4">
            {sharedDocs.map((doc) => (
              <li
                key={doc.id}
                className="border border-gray-200 p-4 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center transform hover:scale-[1.01] shadow-sm hover:shadow-md"
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <div>
                  <strong className="text-xl text-gray-800">{doc.title}</strong>
                  <span className={`ml-3 px-3 py-1 text-xs font-semibold rounded-full ${doc.permission === 'edit' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                    {doc.permission} access
                  </span>
                </div>
                <span className="text-sm text-gray-500 mt-2 sm:mt-0">
                  Last updated: {new Date(doc.updated_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ownedDocs.length === 0 && sharedDocs.length === 0 && !loading && !error && (
        <p className="text-center text-gray-600 text-lg mt-12">
          No documents found. Start by creating your first document above!
        </p>
      )}
    </div>
  );
};

export default Dashboard;