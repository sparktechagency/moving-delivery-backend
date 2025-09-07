import donenv from 'dotenv';
import path from 'path';
donenv.config({ path: path.join(process.cwd(), '.env') });
export default {
  port: process.env.PORT,
  host: process.env.HOST,
  admin_charge: process.env.ADMIN_CHARGE,
  database_url: process.env.DATABASE_URL,
  base_url: process.env.BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  send_email: {
    nodemailer_email: process.env.NODEMAILER_EMAIL,
    nodemailer_password: process.env.NODEMAILER_PASSWORD,
  },
 
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  expires_in: process.env.EXPIRES_IN,
  googleauth: process.env.GOOGLEAUTH,
  appleauth: process.env.APPLEAUTH,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  refresh_expires_in: process.env.REFRESH_EXPIRES_IN,
  send_message: {
    twilio_sid: process.env.TWILIO_SID,
    twilio_auth_token: process.env.TWILIO_AUTH_TOKEN,
    twilio_phone_number: process.env.TWILIO_PHONE_NUMBER,
  },
  uplode_file_cloudinary: {
    cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
    cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
  },
  per_kilometer_price: process.env.PER_KILOMETER_PRICE,
  stripe_payment_gateway: {
    stripe_secret_key: process.env.STRIPE_SECRET_KEY,
    stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    onboarding_refresh_url: process.env.ONBOARDING_REFRESH_URL,
    onboarding_return_url: process.env.ONBOARDING_RETURN_URL,
    checkout_success_url: process.env.CHECKOUT_SUCCESS_URL,
    checkout_cancel_url: process.env.CHECKOUT_CANCEL_URL,
  },
  firebase_account_key: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },
  file_path: process.env.FILE_PATH 
};
