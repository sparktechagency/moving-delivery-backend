import mongoose, { Schema } from 'mongoose';
import { NotificationModel, TNotification } from './notification.interface';
import {
  NotificationPriority,
  NotificationStatus,
} from './notification.constant';

// Create notification schema
const TnotificationSchema = new Schema<TNotification, NotificationModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'userId is  not required'],
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'driverId is not required'],
    },
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'requests',
      required: [false, 'requests is not required'],
    },
    title: {
      type: String,
      required: [true, 'title is required'],
    },
    content: {
      type: String,
      required: [true, 'content is required'],
    },
    icon: {
      type: String,
      required: [false, 'icon is not  required'],
    },
    status: {
      type: String,
      enum: [NotificationStatus.read, NotificationStatus.unread],
      default: NotificationStatus.unread,
    },
    route: {
      type: String,
      required: [false, 'route is not required'],
    },
    priority: {
      type: String,
      enum: [
        NotificationPriority.low,
        NotificationPriority.medium,
        NotificationPriority.high,
      ],
      default: NotificationPriority.medium,
    },
    isDelete: { type: Boolean, required: [false, 'isDelete is not  requred'] },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
    },
  },
);

//middlewere

// middlewere
TnotificationSchema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

TnotificationSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

TnotificationSchema.pre('findOne', function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

// Implement the isNotification method
TnotificationSchema.statics.isNotification = async function (
  id: string,
): Promise<TNotification> {
  const notification = await this.findById(id);
  if (!notification) {
    throw new Error('Notification not found');
  }
  return notification;
};

// Create and export the Notification model
const notifications = mongoose.model<TNotification, NotificationModel>(
  'notifications',
  TnotificationSchema,
);

export default notifications;
