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

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

const app = express();

app.use(cookieParser());

app.use(
  bodyParser.json({
    verify: function (req: express.Request, res: express.Response, buf: Buffer) {
      req.rawBody = buf;
    },
  })
);

app.use(bodyParser.json());



app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.get('/', (_req, res) => {
  res.send({
    status: true,
    message: 'Welcome to moving-delevery-service Api',
  });
});

// 24 hous chcked this  dunction daily 

cron.schedule('0 0 * * *', async () => {
  try {
    await  handel_unpaid_payment();
  } catch (error:any) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cron failed issue',
      error
    );
  }
});



app.use('/api/v1', router);

app.use(notFound);
app.use(globalErrorHandelar);

export default app;