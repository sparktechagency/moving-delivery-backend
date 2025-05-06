import admin from 'firebase-admin';
import dotenv from 'dotenv';
import config from './index';
import httpStatus from 'http-status';
import ApiError from '../error/ApiError';

dotenv.config();

if (
  !config.firebase_account_key.clientEmail ||
  !config.firebase_account_key.privateKey ||
  !config.firebase_account_key.projectId 
  
) {
  throw new ApiError(
    httpStatus.NOT_FOUND,
    'Missing Firebase configuration in environment variables',
    '',
  );
}

// console.log({
//   projectId: config.firebase_account_key.projectId,
//   privateKey: config.firebase_account_key.privateKey,
//   clientEmail: config.firebase_account_key.clientEmail,
// });

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: config.firebase_account_key.projectId,
    privateKey: config.firebase_account_key.privateKey.replace(/\\n/g, '\n'), // ✅ Critical Fix
    clientEmail: config.firebase_account_key.clientEmail,
  } as admin.ServiceAccount),
});



const firebaseAdmin=admin


export default  firebaseAdmin;
