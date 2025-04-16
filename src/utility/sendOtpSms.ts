import twilio from 'twilio';
import status from 'http-status';
import config from '../app/config';
import ApiError from '../app/error/ApiError';

const client = twilio(
  config.send_message.twilio_sid,
  config.send_message.twilio_auth_token,
);

const sendOtpSms = async (phoneNumber: string, otp: number) => {
  console.log({
    twilio_sid: config.send_message.twilio_sid,
    twilio_auth_token: config.send_message.twilio_auth_token,
    twilio_phone_number: config.send_message.twilio_phone_number,
    phoneNumber,
    otp,
  });
  try {
    await client.messages.create({
      body: `Your OTP is: ${otp}. It will expire in 5 minutes.`,
      from: config.send_message.twilio_phone_number,
      to: phoneNumber,
    });
  } catch (error: any) {
    throw new ApiError(
      status.INTERNAL_SERVER_ERROR,
      'Failed to send OTP SMS',
      error,
    );
  }
};

export default sendOtpSms;
