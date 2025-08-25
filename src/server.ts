//await mongoose.connect('mongodb://127.0.0.1:27017/test');
import { Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './app/config';
import ApiError from './app/error/ApiError';
import httpStatus from 'http-status';
import { connectSocket } from './socket/socketConnection';

let server: Server;

async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log('database connected succesfully');

    server = app.listen(Number(config.port), '0.0.0.0', () => {
      console.log(`moving delivery Server is listening on port http://${config.base_url}:${config.port}`);
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

    connectSocket(server)
    
  } catch (err: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'server unavailable',
      err,
    );
  }
}


main().then(() => {
  console.log('---Moving delivery server is running---');
});

