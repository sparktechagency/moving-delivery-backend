import { z } from 'zod';

const messageSchema = z.object({
  body: z.object({
    text: z.string().optional(),
    imageUrl: z.array(z.string()).optional(),
    audioUrl: z.string().optional(),
    receiverId: z.string({ required_error: "receiver id is required" }),
  }).strict({ message: 'Only text | imageUrl | audioUrl | receiverId is allowed in the request body' })
    .superRefine((data, ctx) => {
      if (
        !data.text?.trim() &&
        (!data.imageUrl || data.imageUrl.length === 0) &&
        !data.audioUrl?.trim()
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Either text, imageUrl, or audioUrl is required",
          path: ["text"], 
        });
      }
    }),
});

const messageUpdateSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Text is required').optional(),
  }),
});

const MessageValidationSchema = {
  messageSchema,
  messageUpdateSchema
};

export default MessageValidationSchema;
