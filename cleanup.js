const mongoose = require('mongoose');
const config = require('config');
const User = require('./models/User');

const cleanupUsers = async () => {
    try {
        // Connect to MongoDB
        const dbURI = config.get('mongoURI');
        await mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('MongoDB connected for cleanup...');

        // Delete all non-admin users
        const deleteResult = await User.deleteMany({ role: { $ne: 'admin' } });
        console.log(`Cleanup complete. Removed ${deleteResult.deletedCount} non-admin user(s).`);

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
        process.exit(0); // Exit successfully

    } catch (error) {
        console.error('Error during cleanup script:', error);
        await mongoose.disconnect();
        process.exit(1); // Exit with an error code
    }
};

cleanupUsers();
