const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { connectDB, closeDB } = require('./config/db');
const getJwtSecret = require('./utils/jwtSecret');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    getJwtSecret();
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` Smart Leaving & Visitor Entry System Backend running`);
      console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Port: ${PORT}`);
      console.log(` Health: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });

    // Handle termination signals
    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Closing HTTP server and database...`);
      server.close(async () => {
        await closeDB();
        console.log('Server and database gracefully stopped.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
