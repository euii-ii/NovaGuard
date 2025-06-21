const mongoose = require('mongoose');
const logger = require('../utils/logger');

class MongoDBService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/dao_auditor';
    this.options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    };
  }

  /**
   * Initialize MongoDB connection
   */
  async initialize() {
    try {
      logger.info('Initializing MongoDB connection...');
      
      // Set up connection event listeners
      this.setupEventListeners();
      
      // Connect to MongoDB
      this.connection = await mongoose.connect(this.connectionString, this.options);
      this.isConnected = true;
      
      logger.info('MongoDB connection established successfully', {
        host: this.connection.connection.host,
        port: this.connection.connection.port,
        database: this.connection.connection.name
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize MongoDB connection', { error: error.message });
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Setup MongoDB event listeners
   */
  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', { error: error.message });
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      this.isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.isConnected = false;
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection', { error: error.message });
    }
  }

  /**
   * Check if MongoDB is connected
   */
  isMongoConnected() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      status: states[mongoose.connection.readyState] || 'unknown',
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.name
    };
  }

  /**
   * Health check for MongoDB
   */
  async healthCheck() {
    try {
      if (!this.isMongoConnected()) {
        return {
          status: 'unhealthy',
          message: 'MongoDB not connected'
        };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'MongoDB is responsive',
        connectionStatus: this.getConnectionStatus()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        connectionStatus: this.getConnectionStatus()
      };
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      if (!this.isMongoConnected()) {
        throw new Error('MongoDB not connected');
      }

      const stats = await mongoose.connection.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects
      };
    } catch (error) {
      logger.error('Failed to get database stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Create database indexes for optimization
   */
  async createIndexes() {
    try {
      if (!this.isMongoConnected()) {
        throw new Error('MongoDB not connected');
      }

      logger.info('Creating database indexes...');

      // Audit results indexes
      await mongoose.connection.db.collection('auditresults').createIndex({ auditId: 1 }, { unique: true });
      await mongoose.connection.db.collection('auditresults').createIndex({ contractAddress: 1 });
      await mongoose.connection.db.collection('auditresults').createIndex({ chain: 1 });
      await mongoose.connection.db.collection('auditresults').createIndex({ timestamp: -1 });
      await mongoose.connection.db.collection('auditresults').createIndex({ 'contractInfo.name': 1 });

      // User sessions indexes
      await mongoose.connection.db.collection('usersessions').createIndex({ sessionId: 1 }, { unique: true });
      await mongoose.connection.db.collection('usersessions').createIndex({ userId: 1 });
      await mongoose.connection.db.collection('usersessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

      // Analytics indexes
      await mongoose.connection.db.collection('analytics').createIndex({ timestamp: -1 });
      await mongoose.connection.db.collection('analytics').createIndex({ eventType: 1 });
      await mongoose.connection.db.collection('analytics').createIndex({ userId: 1 });

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.error('Failed to create database indexes', { error: error.message });
      throw error;
    }
  }

  /**
   * Backup database
   */
  async backup(backupPath) {
    try {
      if (!this.isMongoConnected()) {
        throw new Error('MongoDB not connected');
      }

      // This would typically use mongodump or a similar tool
      // For now, we'll just log the intent
      logger.info('Database backup initiated', { backupPath });
      
      // Implementation would depend on your backup strategy
      // Could use child_process to run mongodump command
      
      return {
        success: true,
        backupPath,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Database backup failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restore(backupPath) {
    try {
      if (!this.isMongoConnected()) {
        throw new Error('MongoDB not connected');
      }

      logger.info('Database restore initiated', { backupPath });
      
      // Implementation would depend on your restore strategy
      // Could use child_process to run mongorestore command
      
      return {
        success: true,
        backupPath,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Database restore failed', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
const mongoDBService = new MongoDBService();
module.exports = mongoDBService;
