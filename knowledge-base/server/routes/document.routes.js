import express from 'express';
import {
  getDocuments,
  createDocument,
  updateDocument,
  getVersionHistory,
  getSharedUsers,
  updateSharing,
  getDocumentById,
  removeSharing // Added this for completeness
} from '../controllers/document.controller.js';

const router = express.Router();

router.get('/', getDocuments); // Get all documents (owned + shared)
router.post('/', createDocument); // Create a new document
router.get('/:id', getDocumentById); // Get a specific document by ID
router.put('/:id', updateDocument); // Update an existing document
router.get('/:id/versions', getVersionHistory); // Get version history for a document
router.get('/:id/shared', getSharedUsers); // Get users a document is shared with
router.post('/:id/share', updateSharing); // Share or update sharing permissions
router.delete('/:id/share', removeSharing); // Remove sharing for a user

export default router;