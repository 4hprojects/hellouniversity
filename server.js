require('dotenv').config();
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
const { sendEmail } = require('./utils/emailSender');
const {
  isAuthenticated,
  isAdmin,
  isTeacherOrAdmin,
  isAdminOrManager
} = require('./middleware/routeAuthGuards');

validateEnv();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

function startServer(app) {
  const port = process.env.PORT || 3000;
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
}

async function bootstrap() {
  const app = express();
  const projectRoot = __dirname;
  const mongoUri = process.env.MONGODB_URI;
  const client = new MongoClient(mongoUri);
  const collections = createCollectionStore();
  const upload = multer({ dest: 'uploads/' });

  app.locals.projectRoot = projectRoot;
  app.set('view engine', 'ejs');
  app.set('views', path.join(projectRoot, 'views'));

  configureSession(app, mongoUri);
  configureCoreMiddleware(app, projectRoot);
  app.use((req, res, next) => {
    res.locals.currentPath = req.path || '/';
    next();
  });

  const guards = { isAuthenticated, isAdmin, isTeacherOrAdmin, isAdminOrManager };
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
  startServer(app);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
