import cors from 'cors';
import express from 'express';
import globalErrorHandelar from './middleware/globalErrorHandelar';
import notFound from './middleware/notFound';
import router from './router';

import cookieParser from 'cookie-parser';

const app = express();
app.use(cookieParser());

app.use(express.json());

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
