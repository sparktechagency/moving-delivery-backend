import cors from 'cors';

import express, { Request, Response } from 'express';
import globalErrorHandelar from './middleware/globalErrorHandelar';
import notFound from './middleware/notFound';
import router from './router';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import ApiError from './app/error/ApiError';
import httpStatus from 'http-status';
import handel_unpaid_payment from './utility/handel_unpaid_payment';
import handel_auto_delete_request from './utility/handel_auto_delete_request';
import auto_restricts_algorithm_driver_account from './utility/auto_restricts_algorithm_driver_account';
import auto_delete_unverifyed_user from './utility/auto_delete_unverifyed_user';
import path from 'path';
import config from './app/config';
import handel_notification_delete from './utility/handel_notification_delete';
import { Call } from './module/call/call.model';
import { jwtHelpers } from './app/jwtHalpers/jwtHalpers';
import { fileURLToPath } from 'url';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';


declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}



// Serve static files from public folder

const app = express();

app.use(cookieParser());

app.use(
  bodyParser.json({
    verify: function (
      req: express.Request,
      res: express.Response,
      buf: Buffer,
    ) {
      req.rawBody = buf;
    },
  }),
);

app.use(bodyParser.json());

app.use(express.urlencoded({ extended: true }));
app.use(
  config.file_path as string,
  express.static(path.join(__dirname, 'public')),
);

app.use(cors({
   origin: [
    'http://localhost:5173',       // for local dev
    'http://10.10.20.62:5173'      // for LAN dev
  ]
}));

app.get('/', (_req, res) => {
  res.send({
    status: true,
    message: 'Welcome to moving-delevery-service Api',
  });
});

// 24 hous chcked this  dunction daily

cron.schedule('0 0 * * *', async () => {
  try {
    await handel_unpaid_payment();
  } catch (error: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'issues by the unpaid payemnt Cron failed',
      error,
    );
  }
});

cron.schedule('*/30 * * * *', async () => {
  try {
    await handel_auto_delete_request();
  } catch (error: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      ' issues by the auto user request delete Cron failed ',
      error,
    );
  }
});

cron.schedule('0 2 * * *', async () => {
  try {
    await auto_restricts_algorithm_driver_account();
  } catch (error: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'issues by the restricts user account with searching algorithm cron failed',
      error,
    );
  }
});

// handel_auto_delete_request

cron.schedule('*/30 * * * *', async () => {
  try {
    await auto_delete_unverifyed_user();
  } catch (error: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Issue occurred during automatic deletion of unverified users in cron job.',
      error,
    );
  }
});

cron.schedule('*/2 * * * *', async () => {
  try {
    await handel_notification_delete();
  } catch (error: any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Issues in the notification cron job (every 30 min)',
      error,
    );
  }
});

app.use('/api/v1', router);

app.use(notFound);
app.use(globalErrorHandelar);

export default app;
