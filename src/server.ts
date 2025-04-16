//await mongoose.connect('mongodb://127.0.0.1:27017/test');
import { Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import ApiError from './app/error/ApiError';
import httpStatus from 'http-status';

let server: Server;

async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log('successfully run');

    server = app.listen(config.port, () => {
      console.log(`Example app listening on port ${config.port}`);
    });
  } catch (err: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'server unavailable',
      err,
    );
  }
}

main().then(() => {
  console.log('Successfully Server Running');
});

process.on('unhandledRejection', () => {
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', () => {
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  if (server) {
    server.close(() => {
      console.log('Server closed due to SIGTERM');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  if (server) {
    server.close(() => {
      console.log('Server closed due to SIGINT');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
