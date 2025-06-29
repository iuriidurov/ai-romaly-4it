const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const config = require('config');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the root directory (for HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '')));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const dbURI = config.get('mongoURI');

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected...');
        // Create admin user on startup if not exists
        const createAdminUser = async () => {
            try {
                const adminExists = await User.findOne({ username: 'iuriidurov' });
                if (!adminExists) {
                    console.log('Admin user not found, creating one...');
                    const hashedPassword = await bcrypt.hash('admin', 10);
                    const admin = new User({
                        username: 'iuriidurov',
                        password: hashedPassword,
                        role: 'admin'
                    });
                    await admin.save();
                    console.log('Admin user created successfully.');
                }
            } catch (error) {
                console.error('Error creating admin user:', error);
            }
        };
        createAdminUser();
    })
    .catch(err => console.log(err));

// Basic route to test the server
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to AI-Romaly API!' });
});

// API Routes
const trackRoutes = require('./routes/tracks');
const userRoutes = require('./routes/users');

app.use('/api/tracks', trackRoutes);
app.use('/api/users', userRoutes);

// Page Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/cabinet', (req, res) => {
    res.sendFile(path.join(__dirname, 'author.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
