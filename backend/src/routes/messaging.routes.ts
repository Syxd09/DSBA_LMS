import { Router } from 'express';
import {
    createConversation,
    getConversations,
    getConversationById,
    sendMessage,
    markAsRead,
    addParticipants,
    removeParticipant,
    deleteConversation,
    getMessagingContacts
} from '../controllers/messaging.controller';
import { upload, uploadAttachment, serveFile } from '../controllers/file-upload.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Contacts
router.get('/contacts', getMessagingContacts);

// Conversation management
router.post('/conversations', createConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations/:id', deleteConversation);

// Participant management
router.post('/conversations/:id/participants', addParticipants);
router.delete('/conversations/:id/participants/:userId', removeParticipant);

// Messaging
router.post('/conversations/:id/messages', sendMessage);
router.post('/conversations/:id/upload', upload.single('file'), uploadAttachment);
router.post('/conversations/:id/read', markAsRead);

// File serving
router.get('/files/:conversationId/:filename', serveFile);

export default router;
