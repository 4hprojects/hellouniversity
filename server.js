require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const validator = require('validator');
const multer = require('multer');
const { MongoClient } = require('mongodb');

const { validateEnv } = require('./app/validateEnv');
const { configureSession } = require('./app/configureSession');
const { configureCoreMiddleware } = require('./app/setupCoreMiddleware');
const { createCollectionStore, connectToDatabase } = require('./app/database');
const { registerCoreRoutes, registerDatabaseRoutes } = require('./app/registerRoutes');
const { registerErrorHandlers } = require('./app/registerErrorHandlers');
const { initSocketManager } = require('./app/socketManager');
const { sendEmail } = require('./utils/emailSender');
const {
  isAuthenticated,
  isAdmin,
  isTeacherOrAdmin,
  isTeacherOrAdminOrPending,
  isAdminOrManager
} = require('./middleware/routeAuthGuards');

validateEnv();

function generateOTP() {
  // 6-character cryptographically random hex string
  return crypto.randomBytes(3).toString('hex');
}

async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

function startServer(app, { collections }) {
  const port = process.env.PORT || 3002;
  const server = app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use.`);
      console.error(`Use a different port (example: set PORT=3001) or stop the process using port ${port}.`);
      process.exit(1);
    }

    if (error.code === 'EACCES') {
      console.error(`Permission denied when trying to use port ${port}.`);
      console.error('Try a higher port (e.g., 3001) or run with appropriate permissions.');
      process.exit(1);
    }

    console.error('Server startup error:', error);
    process.exit(1);
  });

  // Attach Socket.IO for live game features
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: { origin: false },
    pingInterval: 25000,
    pingTimeout: 20000
  });

  initSocketManager(io, {
    getLiveGamesCollection: () => collections.liveGamesCollection,
    getLiveSessionsCollection: () => collections.liveSessionsCollection
  });

  console.log('Socket.IO attached for live games (/game namespace)');
}

async function bootstrap() {
  const app = express();
  const projectRoot = __dirname;
  const mongoUri = process.env.MONGODB_URI;
  const client = new MongoClient(mongoUri);
  const collections = createCollectionStore();
  const ALLOWED_UPLOAD_MIMETYPES = new Set([
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]);
  const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_UPLOAD_MIMETYPES.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV and Excel files are allowed.'), false);
      }
    }
  });

  app.locals.projectRoot = projectRoot;
  app.set('view engine', 'ejs');
  app.set('views', path.join(projectRoot, 'views'));

  configureSession(app, mongoUri);
  configureCoreMiddleware(app, projectRoot);
  app.use((req, res, next) => {
    res.locals.currentPath = req.path || '/';
    next();
  });

  const guards = { isAuthenticated, isAdmin, isTeacherOrAdmin, isTeacherOrAdminOrPending, isAdminOrManager };
  const utilities = { sendEmail, bcrypt, validator, hashPassword, generateOTP };

  registerCoreRoutes(app, {
    projectRoot,
    client,
    guards,
    collections,
    utilities,
    upload
  });

  await connectToDatabase({ client, collections });
  console.log('DB connected, now attach DB-dependent routes.');

  registerDatabaseRoutes(app, {
    client,
    guards,
    collections,
    utilities,
    upload
  });

  registerErrorHandlers(app);
  startServer(app, { collections });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
