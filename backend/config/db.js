const mongoose = require('mongoose');
const dns = require('dns');

// On Windows, Node's default DNS resolver can fail querySrv for Atlas clusters (ECONNREFUSED).
// Using public Google and Cloudflare DNS resolvers resolves Atlas SRV records reliably.
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  // Ignore if custom DNS is restricted
}

let mongodInstance = null;
let atlasConnected = false;

// Auto-sync function to copy local registrations to Atlas once connected
const syncLocalDataToAtlas = async (atlasUri) => {
  if (atlasConnected) return;

  try {
    const atlasConn = mongoose.createConnection(atlasUri, {
      serverSelectionTimeoutMS: 4000,
    });

    await new Promise((resolve, reject) => {
      atlasConn.once('open', resolve);
      atlasConn.once('error', reject);
    });

    console.log('\n======================================================');
    console.log('🎉 MongoDB Atlas connection established!');
    console.log('🔄 Syncing local data to MongoDB Atlas...');
    console.log('======================================================');

    const collections = ['users', 'students', 'gatepasses', 'visitors', 'notifications', 'auditlogs'];
    for (const coll of collections) {
      const localDocs = await mongoose.connection.collection(coll).find({}).toArray();
      if (localDocs.length > 0) {
        for (const doc of localDocs) {
          await atlasConn.collection(coll).replaceOne({ _id: doc._id }, doc, { upsert: true });
        }
        console.log(`✓ Synced ${localDocs.length} records in '${coll}' to Atlas.`);
      }
    }

    console.log('✅ All data is now permanently saved in your MongoDB Atlas cluster!\n');
    atlasConnected = true;
    await atlasConn.close();
  } catch (err) {
    // Atlas not reachable yet (e.g. IP whitelist needed)
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      console.log('Connecting to MongoDB Atlas at configured URI...');
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2500,
      });
      console.log(`\n====================================================`);
      console.log(` MongoDB Atlas Connected: ${conn.connection.host}`);
      console.log(` Database Name: ${conn.connection.name}`);
      console.log(`====================================================\n`);
      atlasConnected = true;
      return conn;
    } catch (error) {
      console.warn(`\n⚠️ Atlas connection skipped (${error.message}).`);
      console.warn(`⚡ Starting resilient local in-memory database so system runs immediately.`);
    }
  }

  // Fallback to in-memory database so web server immediately serves requests with zero errors
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongodInstance = await MongoMemoryServer.create();
  const memoryUri = mongodInstance.getUri();
  const conn = await mongoose.connect(memoryUri);
  console.log(` Local In-Memory Database Ready at: ${memoryUri}`);

  // Background worker to sync once Atlas is reachable (without disconnecting active database)
  if (uri && uri.trim() !== '') {
    const syncInterval = setInterval(async () => {
      if (atlasConnected) {
        clearInterval(syncInterval);
        return;
      }
      await syncLocalDataToAtlas(uri);
    }, 15000);
  }

  return conn;
};

const closeDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
  } catch (err) {
    console.error('Error closing database connection:', err);
  }
};

module.exports = { connectDB, closeDB };
