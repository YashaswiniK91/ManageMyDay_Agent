/**
 * Token Storage Utility
 * Handles storing and retrieving user authentication tokens
 * For POC: uses in-memory storage
 * For production: use Firestore, MongoDB, etc.
 */

class TokenStorage {
  constructor(storageType = 'memory') {
    this.storageType = storageType;
    // Share one in-memory map across all instances so routes see the same tokens.
    if (!TokenStorage.sharedTokens) {
      TokenStorage.sharedTokens = new Map();
    }
    this.tokens = TokenStorage.sharedTokens;
  }

  /**
   * Save user token
   */
  async saveToken(userId, tokenData) {
    try {
      if (this.storageType === 'memory') {
        this.tokens.set(userId, tokenData);
        console.log(`Token saved for user: ${userId}`);
        return true;
      }
      // TODO: Implement other storage backends
      throw new Error(`Storage type ${this.storageType} not implemented`);
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  }

  /**
   * Get user token
   */
  async getToken(userId) {
    try {
      if (this.storageType === 'memory') {
        const token = this.tokens.get(userId);
        if (!token) {
          return null;
        }
        
        // Check if token is expired
        if (token.expiry_date && new Date(token.expiry_date) < new Date()) {
          console.log(`Token expired for user: ${userId}`);
          return null;
        }
        
        return token;
      }
      throw new Error(`Storage type ${this.storageType} not implemented`);
    } catch (error) {
      console.error('Error retrieving token:', error);
      throw error;
    }
  }

  /**
   * Delete user token
   */
  async deleteToken(userId) {
    try {
      if (this.storageType === 'memory') {
        this.tokens.delete(userId);
        console.log(`Token deleted for user: ${userId}`);
        return true;
      }
      throw new Error(`Storage type ${this.storageType} not implemented`);
    } catch (error) {
      console.error('Error deleting token:', error);
      throw error;
    }
  }

  /**
   * List all stored users
   */
  async listUsers() {
    if (this.storageType === 'memory') {
      return Array.from(this.tokens.keys());
    }
    throw new Error(`Storage type ${this.storageType} not implemented`);
  }
}

module.exports = TokenStorage;
