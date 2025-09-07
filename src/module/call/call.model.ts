import mongoose, { model, Schema } from 'mongoose';
import { TCall } from './call.interface';

const participantSchema = new mongoose.Schema({
  userId: String,
  role: { type: String, default: 'listener' },
});

const callSchema = new Schema<TCall>(
  {
    roomId: String,
    participants: [participantSchema],
    status: { type: String, default: 'inactive' },
    startTime: Date,
    endTime: Date,
    billingRate: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  },
);

export const Call = model<TCall>('call', callSchema);
