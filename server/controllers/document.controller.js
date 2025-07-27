import { pool } from '../server.js';

export const getDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const searchTerm = req.query.search; // Get the search term from query parameters

    let ownedDocsQuery = 'SELECT id, title, visibility, updated_at FROM documents WHERE user_id=?';
    let sharedDocsQuery = `
      SELECT d.id, d.title, d.visibility, s.permission, d.updated_at
      FROM documents d
      JOIN document_shares s ON d.id = s.document_id
      WHERE s.user_id = ?
    `;
    const queryParams = [userId];
    const sharedQueryParams = [userId];

    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`;
      ownedDocsQuery += ` AND (title LIKE ? OR content LIKE ?)`;
      queryParams.push(searchPattern, searchPattern);

      sharedDocsQuery += ` AND (d.title LIKE ? OR d.content LIKE ?)`;
      sharedQueryParams.push(searchPattern, searchPattern);
    }

    // Order by last updated for both owned and shared documents
    ownedDocsQuery += ` ORDER BY updated_at DESC`;
    sharedDocsQuery += ` ORDER BY d.updated_at DESC`;

    const [ownedDocs] = await pool.query(ownedDocsQuery, queryParams);
    const [sharedDocs] = await pool.query(sharedDocsQuery, sharedQueryParams);

    res.json({ owned: ownedDocs, shared: sharedDocs });
  } catch (err) {
    console.error('Backend getDocuments error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const createDocument = async (req, res) => {
  try {
    const { title, content, visibility } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Document title is required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO documents (user_id, title, content, visibility) VALUES (?, ?, ?, ?)',
      [req.user.id, title, content || '', visibility || 'private']
    );
    res.status(201).json({ message: 'Document created successfully.', documentId: result.insertId });
  } catch (err) {
    console.error('Backend createDocument error:', err);
    res.status(500).json({ error: 'Failed to create document.' });
  }
};

export const getDocumentById = async (req, res) => {
  try {
    const docId = req.params.id;
    const userId = req.user.id;

    // Check if the user owns the document or has explicit share permission or if it's public
    const [doc] = await pool.query(
      `SELECT d.*, u.email as owner_email
       FROM documents d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ? AND (d.user_id = ? OR d.visibility = 'public' OR d.id IN (SELECT document_id FROM document_shares WHERE user_id = ?))`,
      [docId, userId, userId]
    );

    if (doc.length === 0) {
      return res.status(404).json({ error: 'Document not found or access denied.' });
    }
    res.json(doc[0]);
  } catch (err) {
    console.error('Backend getDocumentById error:', err);
    res.status(500).json({ error: 'Failed to retrieve document.' });
  }
};


export const updateDocument = async (req, res) => {
  try {
    const { content, title, visibility } = req.body;
    const docId = req.params.id;
    const userId = req.user.id; // User making the request

    // First, check if the user has edit permission (owner or explicit edit share)
    const [docCheck] = await pool.query(
      `SELECT d.id, d.user_id, d.content, s.permission
       FROM documents d
       LEFT JOIN document_shares s ON d.id = s.document_id AND s.user_id = ?
       WHERE d.id = ?`,
      [userId, docId]
    );

    if (docCheck.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    const document = docCheck[0];

    // Check if user is owner or has 'edit' permission
    if (document.user_id !== userId && document.permission !== 'edit') {
      return res.status(403).json({ error: 'Permission denied to edit this document.' });
    }

    // Save version history BEFORE updating the document content
    // Only save a new version if content has actually changed
    if (content !== undefined && document.content !== content) {
        // Get the current max version number for this document
        const [maxVersion] = await pool.query('SELECT COALESCE(MAX(version_number), 0) AS max_v FROM document_versions WHERE document_id=?', [docId]);
        const newVersionNumber = maxVersion[0].max_v + 1;

        await pool.query(
            'INSERT INTO document_versions (document_id, version_number, content, modified_by) VALUES (?, ?, ?, ?)',
            [docId, newVersionNumber, document.content, userId] // Save the OLD content as a new version
        );
    }

    // Update the document fields
    const updateFields = {};
    if (content !== undefined) updateFields.content = content;
    if (title !== undefined) updateFields.title = title;
    // Only owner can change visibility
    if (visibility !== undefined && document.user_id === userId) updateFields.visibility = visibility;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No fields to update provided.' });
    }

    const setClause = Object.keys(updateFields).map(key => `${key}=?`).join(', ');
    const updateValues = Object.values(updateFields);

    await pool.query(`UPDATE documents SET ${setClause} WHERE id=?`, [...updateValues, docId]);

    // --- User Mentions and Auto-sharing Logic ---
    // This is a basic implementation. For production, consider robust parsing and queueing.
    if (content) {
      // Regex to find @email@domain.com patterns in the content
      const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      let match;
      const mentionedEmails = new Set(); // Use a Set to store unique emails

      while ((match = mentionRegex.exec(content)) !== null) {
        mentionedEmails.add(match[1]); // Capture the full email
      }

      for (const email of mentionedEmails) {
        try {
          const [mentionedUserRows] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
          if (mentionedUserRows.length > 0) {
            const mentionedUserId = mentionedUserRows[0].id;

            // Do not auto-share with the document owner or the user who made the mention
            if (mentionedUserId === document.user_id || mentionedUserId === userId) {
              continue;
            }

            // Check if already shared
            const [existingShare] = await pool.query(
              'SELECT permission FROM document_shares WHERE document_id = ? AND user_id = ?',
              [docId, mentionedUserId]
            );

            // If not shared or only has 'view' permission, ensure 'view' permission is set
            if (existingShare.length === 0 || existingShare[0].permission === 'view') {
              await pool.query(
                'INSERT INTO document_shares (document_id, user_id, permission) VALUES (?, ?, ?) ' +
                'ON DUPLICATE KEY UPDATE permission=?',
                [docId, mentionedUserId, 'view', 'view'] // Auto-share with 'view' permission
              );
              console.log(`Auto-shared document ${docId} with ${email} (view access).`);
            }
          }
        } catch (shareErr) {
          console.error(`Error auto-sharing with ${email}:`, shareErr);
          // Continue processing other mentions even if one fails
        }
      }
    }
    // --- End User Mentions and Auto-sharing Logic ---

    res.json({ message: 'Document updated successfully.' });
  } catch (err) {
    console.error('Backend updateDocument error:', err);
    res.status(500).json({ error: 'Failed to update document.' });
  }
};


export const getVersionHistory = async (req, res) => {
  try {
    const docId = req.params.id;
    const userId = req.user.id;

    // Check if user has access to the document first (owner, public, or shared)
    const [accessCheck] = await pool.query(
      `SELECT d.id FROM documents d WHERE d.id = ? AND (d.user_id = ? OR d.visibility = 'public' OR d.id IN (SELECT document_id FROM document_shares WHERE user_id = ?))`,
      [docId, userId, userId]
    );

    if (accessCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied to document versions.' });
    }

    // Fetch versions, ordered by version number descending
    const [versions] = await pool.query(
      `SELECT dv.version_number, dv.content, u.email as modified_by_email, dv.modified_at
       FROM document_versions dv
       LEFT JOIN users u ON dv.modified_by = u.id
       WHERE dv.document_id=? ORDER BY dv.version_number DESC`,
      [docId]
    );
    res.json(versions);
  } catch (err) {
    console.error('Backend getVersionHistory error:', err);
    res.status(500).json({ error: 'Failed to retrieve version history.' });
  }
};

export const getSharedUsers = async (req, res) => {
  try {
    const docId = req.params.id;
    const userId = req.user.id;

    // Only the document owner can see who it's shared with
    const [docOwner] = await pool.query('SELECT user_id FROM documents WHERE id = ?', [docId]);
    if (docOwner.length === 0 || docOwner[0].user_id !== userId) {
      return res.status(403).json({ error: 'Permission denied. Only document owner can view sharing.' });
    }

    const [users] = await pool.query(
      'SELECT u.id, u.email, s.permission FROM document_shares s JOIN users u ON s.user_id=u.id WHERE s.document_id=?',
      [docId]
    );
    res.json(users);
  } catch (err) {
    console.error('Backend getSharedUsers error:', err);
    res.status(500).json({ error: 'Failed to retrieve shared users.' });
  }
};

export const updateSharing = async (req, res) => {
  try {
    const docId = req.params.id;
    const { userEmail, permission } = req.body;
    const ownerId = req.user.id; // The user making the request (must be owner)

    // Verify current user is the document owner
    const [docOwner] = await pool.query('SELECT user_id FROM documents WHERE id = ?', [docId]);
    if (docOwner.length === 0 || docOwner[0].user_id !== ownerId) {
      return res.status(403).json({ error: 'Permission denied. Only document owner can manage sharing.' });
    }

    // Find the user to share with
    const [userToShareWith] = await pool.query('SELECT id FROM users WHERE email=?', [userEmail]);
    if (userToShareWith.length === 0) {
      return res.status(404).json({ error: 'User to share with not found.' });
    }

    const sharedUserId = userToShareWith[0].id;

    // Prevent sharing with self
    if (sharedUserId === ownerId) {
      return res.status(400).json({ error: 'Cannot share a document with yourself.' });
    }

    // Insert or update sharing permission
    await pool.query(
      'INSERT INTO document_shares (document_id, user_id, permission) VALUES (?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE permission=?',
      [docId, sharedUserId, permission, permission]
    );
    res.json({ message: 'User sharing updated successfully.' });
  } catch (err) {
    console.error('Backend updateSharing error:', err);
    res.status(500).json({ error: 'Failed to update sharing.' });
  }
};

export const removeSharing = async (req, res) => {
  try {
    const docId = req.params.id;
    const { userEmail } = req.body; // DELETE requests with body are handled via req.body
    const ownerId = req.user.id;

    // Verify current user is the document owner
    const [docOwner] = await pool.query('SELECT user_id FROM documents WHERE id = ?', [docId]);
    if (docOwner.length === 0 || docOwner[0].user_id !== ownerId) {
      return res.status(403).json({ error: 'Permission denied. Only document owner can manage sharing.' });
    }

    const [userToRemove] = await pool.query('SELECT id FROM users WHERE email=?', [userEmail]);
    if (userToRemove.length === 0) {
      return res.status(404).json({ error: 'User to remove not found.' });
    }

    await pool.query('DELETE FROM document_shares WHERE document_id = ? AND user_id = ?', [docId, userToRemove[0].id]);
    res.json({ message: 'User sharing removed successfully.' });
  } catch (err) {
    console.error('Backend removeSharing error:', err);
    res.status(500).json({ error: 'Failed to remove sharing.' });
  }
};