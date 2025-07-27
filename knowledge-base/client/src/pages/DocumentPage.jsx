import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext, MessageContext } from '../context/AuthContext.jsx';
import axios from 'axios';
import Editor from '../components/Editor.jsx';
import VersionHistory from '../components/VersionHistory.jsx';

const DocumentPage = () => {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext);
  const { showMessage } = useContext(MessageContext);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [sharedUsers, setSharedUsers] = useState([]);
  const [newSharedUserEmail, setNewSharedUserEmail] = useState('');
  const [newSharedUserPermission, setNewSharedUserPermission] = useState('view');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false); // State for title edit mode

  // Function to fetch document details and shared users
  const fetchDocDetails = useCallback(async () => {
    if (!token) {
      navigate('/');
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const docData = res.data;
      setTitle(docData.title);
      setContent(docData.content || '');
      setVisibility(docData.visibility);

      if (user && docData.user_id === user.id) {
        setIsOwner(true);
        // If owner, fetch shared users
        const sharedRes = await axios.get(`http://localhost:5000/api/documents/${id}/shared`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSharedUsers(sharedRes.data);
      } else {
        setIsOwner(false);
        setSharedUsers([]); // Clear shared users if not owner
      }
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Failed to fetch document:", err);
      setError(err.response?.data?.error || "Failed to load document. Access denied.");
      showMessage(err.response?.data?.error || "Failed to load document.", "error");
      if (err.response && (err.response.status === 401 || err.response.status === 403 || err.response.status === 404)) {
        navigate('/dashboard'); // Go back to dashboard if no access or not found
      }
    } finally {
      setLoading(false);
    }
  }, [id, token, user, navigate, showMessage]);

  useEffect(() => {
    fetchDocDetails();
  }, [fetchDocDetails]);

  // Determine if the user has edit access
  const canEdit = isOwner || (sharedUsers.some(u => u.id === user?.id && u.permission === 'edit'));

  // Save document with debounce
  useEffect(() => {
    if (!canEdit) return; // Only auto-save if editable

    const handler = setTimeout(() => {
      if (!loading && !saving) { // Only auto-save if not currently loading or manually saving
        // Check if content or title has actually changed before auto-saving
        // (This would require storing initial content/title or comparing with fetched state)
        // For simplicity, we'll just trigger save, backend will handle actual change detection for versioning.
        saveDoc(true); // Call with autoSave flag
      }
    }, 1500); // Auto-save every 1.5 seconds after last change

    return () => {
      clearTimeout(handler);
    };
  }, [content, title, visibility, canEdit, loading]); // Dependencies for auto-save

  const saveDoc = async (isAutoSave = false) => {
    if (!canEdit) {
      showMessage("You do not have permission to edit this document.", "error");
      return;
    }
    setSaving(true);
    try {
      await axios.put(`http://localhost:5000/api/documents/${id}`, { content, title, visibility }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!isAutoSave) {
        showMessage('Document saved successfully!', 'success');
      }
      // Re-fetch document details to update shared users and ensure latest state,
      // especially after auto-sharing via mentions.
      fetchDocDetails();
    } catch (err) {
      console.error("Failed to save document:", err);
      showMessage(err.response?.data?.error || 'Failed to save document.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleShareUser = async (e) => {
    e.preventDefault();
    if (!newSharedUserEmail.trim()) {
      showMessage('Email cannot be empty.', 'warning');
      return;
    }
    try {
      await axios.post(`http://localhost:5000/api/documents/${id}/share`,
        { userEmail: newSharedUserEmail, permission: newSharedUserPermission },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMessage(`Document shared with ${newSharedUserEmail} with ${newSharedUserPermission} permission.`, 'success');
      setNewSharedUserEmail('');
      fetchDocDetails(); // Re-fetch shared users list
    } catch (err) {
      console.error("Failed to share document:", err);
      showMessage(err.response?.data?.error || 'Failed to share document.', 'error');
    }
  };

  const handleRemoveShare = async (emailToRemove) => {
    if (!window.confirm(`Are you sure you want to revoke sharing for ${emailToRemove}?`)) {
      return; // User cancelled
    }
    try {
      await axios.delete(`http://localhost:5000/api/documents/${id}/share`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { userEmail: emailToRemove } // DELETE with body
        }
      );
      showMessage(`Sharing revoked for ${emailToRemove}.`, 'info');
      fetchDocDetails(); // Re-fetch shared users list
    } catch (err) {
      console.error("Failed to remove sharing:", err);
      showMessage(err.response?.data?.error || 'Failed to remove sharing.', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-600 text-xl font-medium">Loading document...</div>;
  if (error) return <div className="p-8 text-center text-red-600 text-xl font-medium">{error}</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h1 className="text-4xl font-extrabold text-gray-900">Document Editor</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-lg transform hover:scale-105 font-semibold"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Document Title and Visibility */}
      <div className="bg-white p-8 rounded-xl shadow-md mb-8 border border-gray-200">
        <div className="flex items-center gap-4 mb-5">
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { setIsEditingTitle(false); saveDoc(); }} // Save on blur
              onKeyPress={(e) => { if (e.key === 'Enter') { setIsEditingTitle(false); saveDoc(); } }} // Save on Enter
              className="border-b border-gray-300 focus:border-blue-500 outline-none text-3xl font-bold w-full bg-transparent p-1 -ml-1"
              disabled={!canEdit}
              autoFocus
            />
          ) : (
            <h2
              className="text-3xl font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => canEdit && setIsEditingTitle(true)}
            >
              {title || "Untitled Document"}
            </h2>
          )}
          {saving && <span className="text-sm text-gray-500 ml-4">Saving...</span>}
        </div>

        <div className="flex items-center gap-4 mb-5">
          <label htmlFor="visibility" className="text-lg font-medium text-gray-700">Visibility:</label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none bg-white"
            disabled={!isOwner}
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
          {!isOwner && <span className="text-sm text-gray-500">(Only owner can change visibility)</span>}
        </div>

        {/* WYSIWYG Editor */}
        <Editor content={content} onChange={setContent} readOnly={!canEdit} />

        {canEdit && (
          <button
            onClick={() => saveDoc()}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg transform hover:scale-105 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Document'}
          </button>
        )}
        {!canEdit && <p className="mt-6 text-gray-600 text-lg font-medium">You have view-only access to this document.</p>}
      </div>

      {/* Sharing Options (only for owner) */}
      {isOwner && (
        <div className="mt-8 bg-white p-8 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-2xl font-bold mb-5 text-gray-800">Sharing Options</h3>
          <form onSubmit={handleShareUser} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
            <div className="md:col-span-2">
              <label htmlFor="shareEmail" className="block text-sm font-medium text-gray-700 mb-1">Email to Share With</label>
              <input
                type="email"
                id="shareEmail"
                placeholder="user@example.com"
                className="border border-gray-300 p-3 w-full rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 outline-none"
                value={newSharedUserEmail}
                onChange={(e) => setNewSharedUserEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="sharePermission" className="block text-sm font-medium text-gray-700 mb-1">Permission</label>
              <select
                id="sharePermission"
                className="border border-gray-300 p-3 w-full rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 outline-none bg-white"
                value={newSharedUserPermission}
                onChange={(e) => setNewSharedUserPermission(e.target.value)}
              >
                <option value="view">View</option>
                <option value="edit">Edit</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="bg-purple-600 text-white p-3 w-full rounded-lg font-semibold text-lg hover:bg-purple-700 transition-all duration-200 shadow-md transform hover:scale-105">
                Share Document
              </button>
            </div>
          </form>

          {sharedUsers.length > 0 ? (
            <div>
              <h4 className="font-medium text-gray-700 mb-3 text-lg">Currently Shared With:</h4>
              <ul className="space-y-3">
                {sharedUsers.map(sharedUser => (
                  <li key={sharedUser.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                    <span className="text-gray-800 text-base">{sharedUser.email} (<span className="font-semibold">{sharedUser.permission}</span>)</span>
                    <button
                      onClick={() => handleRemoveShare(sharedUser.email)}
                      className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600 transition-colors shadow-sm"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-600 text-base">This document is not currently shared with any specific users.</p>
          )}
        </div>
      )}

      {/* Version History */}
      <VersionHistory documentId={id} currentContent={content} />
    </div>
  );
};

export default DocumentPage;