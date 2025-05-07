import cors from 'cors';
import express, { Request, Response } from 'express';
import globalErrorHandelar from './middleware/globalErrorHandelar';
import notFound from './middleware/notFound';
import router from './router';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

// Extend the Express Request type to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

const app = express();

app.use(cookieParser());

// Only use one body parser - use bodyParser.json with the verify option to save rawBody
app.use(
  bodyParser.json({
    verify: function (req: express.Request, res: express.Response, buf: Buffer) {
      req.rawBody = buf;
    },
  })
);

app.use(bodyParser.json());



// For URL encoded data
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.get('/', (_req, res) => {
  res.send({
    status: true,
    message: 'Welcome to moving-delevery-service Api',
  });
});

app.use('/api/v1', router);

app.use(notFound);
app.use(globalErrorHandelar);

export default app;