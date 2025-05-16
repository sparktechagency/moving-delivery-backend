import { z } from 'zod';


const messageSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Text is required'),
    imageUrl: z.array(z.string()).optional(),
    videoUrl: z.array(z.string()).optional(),
    senderId: z.string({ required_error: 'sender id is   requires' }),
    receiverId: z.string({ required_error: 'reciver id is required' }),
    msgByUserId: z.string({ required_error: 'msg by userId is required' }),
  }),
});

const MessageValidationSchema = {
  messageSchema,
};

export default MessageValidationSchema;
