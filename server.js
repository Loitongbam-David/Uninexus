const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const multer = require('multer');

require('dotenv').config();

const { register, login } = require('./src/controllers/authController');
const { uploadFile, getFilesForChannel } = require('./src/controllers/fileController');
const { createChannel, getChannels, inviteToChannel, deleteChannel } = require('./src/controllers/channelController');
const { getMessagesSync } = require('./src/controllers/messageController');
const { requireAuth } = require('./src/middleware/authMiddleware');
const supabase = require('./src/config/supabase');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src', 'public')));

// Set up Multer for memory upload buffer
const storage = multer.memoryStorage();
const upload = multer({ 
    storage, 
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// API Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/upload', requireAuth, upload.single('file'), uploadFile);
app.get('/api/files/:channel_id', requireAuth, getFilesForChannel);
app.get('/api/channels', requireAuth, getChannels);
app.post('/api/channels', requireAuth, createChannel);
app.delete('/api/channels/:channel_id', requireAuth, deleteChannel);
app.post('/api/channels/invite', requireAuth, inviteToChannel);
app.get('/api/history/:channel_id', requireAuth, getMessagesSync);

// Socket.io Real-Time Bridge
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_channel', (channelId) => {
        socket.join(channelId);
        console.log(`Socket ${socket.id} joined channel ${channelId}`);
    });

    socket.on('send_message', async (msgData) => {
        try {
            // Write definitively to Database
            const { error } = await supabase.from('messages').insert([{
                channel_id: msgData.channel_id,
                user_id: msgData.user_id,
                content: msgData.content
            }]);
            if (error) console.error("DB Insert Msg Error", error);
        } catch(e) {
            console.error("Exception handling socket message", e);
        }
        
        // Broadcast cleanly
        io.to(msgData.channel_id).emit('receive_message', msgData);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Fallback for SPA
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, 'src', 'public', 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`UniNexus Server is bubbling on http://localhost:${PORT}`);
});
