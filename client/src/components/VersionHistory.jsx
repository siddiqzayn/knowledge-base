import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext, MessageContext } from '../context/AuthContext.jsx';
import { diff_match_patch } from 'diff-match-patch'; // Import for diffing

// Initialize diff-match-patch
const dmp = new diff_match_patch();

export default function VersionHistory({ documentId, currentContent }) {
  const { token } = useContext(AuthContext);
  const { showMessage } = useContext(MessageContext);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVersionContent, setSelectedVersionContent] = useState(null);
  const [diffView, setDiffView] = useState('');

  useEffect(() => {
    if (!documentId || !token) {
      setLoading(false);
      return;
    }

    const fetchVersions = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:5000/api/documents/${documentId}/versions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVersions(res.data);
      } catch (err) {
        console.error("Failed to fetch version history:", err);
        setError("Failed to load version history. Access denied or document not found.");
        showMessage("Failed to load version history.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [documentId, token, showMessage]);

  // Function to show content of a specific version
  const handleViewVersion = (content) => {
    setSelectedVersionContent(content);
    setDiffView(''); // Clear diff view
  };

  // Function to compare a version with the current content
  const handleCompareWithCurrent = (versionContent) => {
    if (!currentContent) {
      showMessage("Current document content is not available for comparison.", "warning");
      return;
    }
    const diff = dmp.diff_main(versionContent, currentContent);
    dmp.diff_cleanupSemantic(diff); // Improve readability
    const html = dmp.diff_prettyHtml(diff);
    setDiffView(html);
    setSelectedVersionContent(null); // Clear single version view
  };

  if (loading) return <div className="mt-6 p-4 text-center text-gray-600">Loading version history...</div>;
  if (error) return <div className="mt-6 p-4 text-center text-red-500">{error}</div>;
  if (versions.length === 0) return <div className="mt-6 p-4 text-center text-gray-600">No version history available for this document.</div>;

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Version History</h2>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <ul className="space-y-3">
          {versions.map(v => (
            <li key={v.version_number} className="border border-gray-200 p-3 rounded-lg bg-gray-50 text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-gray-700">Version {v.version_number}</span>
                <span className="text-gray-500 text-xs">
                  by {v.modified_by_email || 'Unknown'} on {new Date(v.modified_at).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleViewVersion(v.content)}
                  className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs"
                >
                  View Version
                </button>
                <button
                  onClick={() => handleCompareWithCurrent(v.content)}
                  className="px-3 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors text-xs"
                >
                  Compare with Current
                </button>
              </div>
            </li>
          ))}
        </ul>

        {selectedVersionContent && (
          <div className="mt-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">Selected Version Content:</h3>
            <div
              dangerouslySetInnerHTML={{ __html: selectedVersionContent }}
              className="quill-content-display bg-white p-3 rounded-md border border-gray-200 overflow-auto max-h-96"
            />
            <button
              onClick={() => setSelectedVersionContent(null)}
              className="mt-3 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors text-sm"
            >
              Close View
            </button>
          </div>
        )}

        {diffView && (
          <div className="mt-6 p-4 border border-purple-200 bg-purple-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-purple-800">Version Comparison (Old vs. Current):</h3>
            <div
              dangerouslySetInnerHTML={{ __html: diffView }}
              className="quill-content-display bg-white p-3 rounded-md border border-gray-200 overflow-auto max-h-96"
            />
            <button
              onClick={() => setDiffView('')}
              className="mt-3 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors text-sm"
            >
              Close Diff
            </button>
          </div>
        )}
      </div>
    </div>
  );
}