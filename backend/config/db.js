const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the URI from environment variables.
 * Exits the process on failure so the server doesn't silently run disconnected.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 7+ doesn't need these options, but listed for clarity
      // useNewUrlParser: true,     // deprecated in Mongoose 7
      // useUnifiedTopology: true,  // deprecated in Mongoose 7
    });

    console.log(`✅  MongoDB connected: ${conn.connection.host}`);

    // Handle graceful disconnect events
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting reconnect…');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('✅  MongoDB reconnected');
    });

  } catch (err) {
    console.error(`❌  MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;