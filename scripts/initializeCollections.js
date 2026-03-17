/**
 * Database Initialization Script
 * Creates collections and indexes needed for the modular auth system
 * 
 * Run with: node scripts/initializeCollections.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function initializeCollections() {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;
    
    if (!mongoUri || !dbName) {
        console.error('❌ [Init] Missing MONGODB_URI or DB_NAME in .env');
        process.exit(1);
    }

    const client = new MongoClient(mongoUri);

    try {
        console.log('🔌 [Init] Connecting to MongoDB...');
        await client.connect();
        
        const db = client.db(dbName);
        console.log(`✅ [Init] Connected to database: ${dbName}\n`);

        // ============ CREATE tblAccountLockouts COLLECTION ============
        console.log('📝 [Init] Setting up tblAccountLockouts collection...');
        
        try {
            await db.createCollection('tblAccountLockouts');
            console.log('✅ [Init] Created collection: tblAccountLockouts');
        } catch (err) {
            if (err.codeName === 'NamespaceExists') {
                console.log('ℹ️  [Init] Collection already exists: tblAccountLockouts');
            } else {
                throw err;
            }
        }

        // Create indexes for tblAccountLockouts
        const lockoutsCollection = db.collection('tblAccountLockouts');
        
        // Index 1: studentIDNumber (for quick lookups)
        await lockoutsCollection.createIndex(
            { studentIDNumber: 1 },
            { unique: true }
        );
        console.log('✅ [Init] Created index: tblAccountLockouts.studentIDNumber (UNIQUE)');

        // Index 2: lockedUntil (for auto-deletion after expiration)
        await lockoutsCollection.createIndex(
            { lockedUntil: 1 },
            { expireAfterSeconds: 0 }
        );
        console.log('✅ [Init] Created index: tblAccountLockouts.lockedUntil (TTL)');

        // Index 3: lastFailedAttempt (for analytics)
        await lockoutsCollection.createIndex(
            { lastFailedAttempt: -1 }
        );
        console.log('✅ [Init] Created index: tblAccountLockouts.lastFailedAttempt');

        // ============ VERIFY tblLogs COLLECTION ============
        console.log('\n📝 [Init] Setting up tblLogs collection...');
        
        try {
            await db.createCollection('tblLogs');
            console.log('✅ [Init] Created collection: tblLogs');
        } catch (err) {
            if (err.codeName === 'NamespaceExists') {
                console.log('ℹ️  [Init] Collection already exists: tblLogs');
            } else {
                throw err;
            }
        }

        // Create indexes for tblLogs
        const logsCollection = db.collection('tblLogs');

        // Index 1: timestamp (for chronological queries)
        await logsCollection.createIndex(
            { timestamp: -1 }
        );
        console.log('✅ [Init] Created index: tblLogs.timestamp');

        // Index 2: action (for filtering by action type)
        await logsCollection.createIndex(
            { action: 1 }
        );
        console.log('✅ [Init] Created index: tblLogs.action');

        // Index 3: studentIDNumber (for user-specific logs)
        await logsCollection.createIndex(
            { 'user.studentIDNumber': 1 }
        );
        console.log('✅ [Init] Created index: tblLogs.user.studentIDNumber');

        // Index 4: success (for filtering successful/failed actions)
        await logsCollection.createIndex(
            { success: 1 }
        );
        console.log('✅ [Init] Created index: tblLogs.success');

        // Index 5: compound index for audit trail queries
        await logsCollection.createIndex(
            { 'user.studentIDNumber': 1, action: 1, timestamp: -1 }
        );
        console.log('✅ [Init] Created index: tblLogs (compound: user + action + timestamp)');

        // ============ VERIFY tblUser COLLECTION ============
        console.log('\n📝 [Init] Verifying tblUser collection...');
        
        try {
            const userCollection = db.collection('tblUser');
            
            // Index for studentIDNumber
            await userCollection.createIndex(
                { studentIDNumber: 1 },
                { unique: true }
            );
            console.log('✅ [Init] Created/verified index: tblUser.studentIDNumber (UNIQUE)');

            // Index for email
            await userCollection.createIndex(
                { email: 1 },
                { sparse: true }
            );
            console.log('✅ [Init] Created/verified index: tblUser.email (SPARSE)');

            // Index for role
            await userCollection.createIndex(
                { role: 1 }
            );
            console.log('✅ [Init] Created/verified index: tblUser.role');

        } catch (err) {
            console.warn('⚠️  [Init] Could not verify tblUser:', err.message);
        }

        // ============ COLLECTION SUMMARY ============
        console.log('\n📊 [Init] Collecting statistics...');

        const collections = await db.listCollections().toArray();
        console.log(`✅ [Init] Total collections in database: ${collections.length}`);

        const lockoutCount = await lockoutsCollection.countDocuments();
        const logsCount = await logsCollection.countDocuments();
        
        try {
            const userCount = await db.collection('tblUser').countDocuments();
            console.log(`\n📈 [Init] Document counts:`);
            console.log(`   - tblAccountLockouts: ${lockoutCount} documents`);
            console.log(`   - tblLogs: ${logsCount} documents`);
            console.log(`   - tblUser: ${userCount} documents`);
        } catch (err) {
            console.log(`\n📈 [Init] Document counts:`);
            console.log(`   - tblAccountLockouts: ${lockoutCount} documents`);
            console.log(`   - tblLogs: ${logsCount} documents`);
            console.log(`   - tblUser: Collection exists`);
        }

        // ============ DISPLAY SCHEMA SAMPLES ============
        console.log('\n📋 [Init] Expected schema samples:\n');

        console.log('🔒 tblAccountLockouts schema:');
        console.log(`{
  _id: ObjectId,
  studentIDNumber: string,
  failedAttempts: number,
  lockedUntil: Date,
  lastFailedAttempt: Date
}\n`);

        console.log('📝 tblLogs schema (LOGIN example):');
        console.log(`{
  _id: ObjectId,
  timestamp: Date,
  action: "LOGIN",
  success: boolean,
  user: {
    studentIDNumber: string,
    firstName: string,
    lastName: string,
    role: string
  },
  ip: string,
  userAgent: string,
  reason: string (optional)
}\n`);

        console.log('👤 tblUser schema:');
        console.log(`{
  _id: ObjectId,
  studentIDNumber: string,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: "student" | "teacher" | "admin"
}\n`);

        // ============ SUCCESS MESSAGE ============
        console.log('✅ [Init] Database initialization completed successfully!\n');
        console.log('📌 [Init] Summary:');
        console.log('   ✅ tblAccountLockouts: Ready');
        console.log('   ✅ tblLogs: Ready');
        console.log('   ✅ tblUser: Ready');
        console.log('   ✅ All indexes created\n');
        console.log('🚀 [Init] Next steps:');
        console.log('   1. Run: npm start');
        console.log('   2. Test login at: http://localhost:3000/login');
        console.log('   3. Try account lockout (3 failed attempts)\n');

    } catch (err) {
        console.error('❌ [Init] Error during initialization:', err);
        process.exit(1);
    } finally {
        await client.close();
        console.log('🔌 [Init] Database connection closed');
    }
}

// Run initialization
initializeCollections();