import { Schema, model } from 'mongoose';
import { IGeoLocation, TUser, UserModel } from './user.interface';
import bcrypt from 'bcrypt';
import config from '../../app/config';
import { USER_ACCESSIBILITY, USER_ROLE } from './user.constant';

const GeoLocationSchema = new Schema<IGeoLocation>(
  {
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates are required'],
      validate: {
        validator: function (v: number[]) {
          return Array.isArray(v) && v.length === 2;
        },
        message: 'Coordinates must be in format [longitude, latitude]',
      },
    },
  },
  { _id: false },
);

const TUserSchema = new Schema<TUser, UserModel>(
  {
    name: { type: String, required: [false, 'user name is Required'] },
    password: { type: String, required: [false, 'Password is Required'] },
    email: {
      type: String,
      required: [false, 'Email is Required'],
      trim: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: [false, 'phone number is required'],
      unique: true,
    },
    verificationCode: {
      type: Number,
      required: [false, 'verification Code is Required'],
      unique: true,
    },
    isVerify: {
      type: Boolean,
      required: [false, 'isVartify is not required'],
      default: false,
    },
    role: {
      type: String,
      enum: {
        values: [USER_ROLE.admin, USER_ROLE.driver, USER_ROLE.user],
        message: '{VALUE} is Not Required',
      },
      required: [true, 'Role is Required'],
      default: USER_ROLE.user,
    },
    status: {
      type: String,
      enum: {
        values: [USER_ACCESSIBILITY.isProgress, USER_ACCESSIBILITY.blocked],
        message: '{VALUE} is not required',
      },
      required: [true, 'Status is Required'],
      default: USER_ACCESSIBILITY.isProgress as any,
    },
    photo: {
      type: String,
      required: [false, 'photo is not required'],
      default: null,
    },
    provider: {
      type: String,
      enum: {
        values: [config.googleauth, config.appleauth, 'email auth'],
        message: '{VALUE} is not a valid provider',
      },
      required: [false, 'Provider is not Required'],
      default: 'email auth',
    },

    from: {
      type: GeoLocationSchema,
      required: [true, 'Origin location is required'],
    },
    to: {
      type: GeoLocationSchema,
      required: [true, 'Destination location is required'],
    },
    isDelete: {
      type: Boolean,
      required: [true, 'isDeleted is Required'],
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

TUserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
});

TUserSchema.index({ 'from.coordinates': '2dsphere' });

// mongoose middleware
TUserSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(
      user.password,
      Number(config.bcrypt_salt_rounds),
    );
  }
  next();
});

TUserSchema.post('save', function (doc, next) {
  doc.password = '';
  next();
});

TUserSchema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

TUserSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

TUserSchema.pre('findOne', function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

TUserSchema.statics.isUserExistByCustomId = async function (id: string) {
  return await users.findOne({ id });
};

TUserSchema.statics.isPasswordMatched = async function (
  plainTextPassword: string,
  hashPassword: string,
) {
  const password = await bcrypt.compare(plainTextPassword, hashPassword);
  return password;
};

TUserSchema.statics.isJWTIssuesBeforePasswordChange = async function (
  passwordChangeTimestamp: Date,
  jwtIssuesTime: number,
) {
  const passwordChangeTime = new Date(passwordChangeTimestamp).getTime() / 1000;
  return passwordChangeTime > jwtIssuesTime;
};

const users = model<TUser, UserModel>('users', TUserSchema);

export default users;
