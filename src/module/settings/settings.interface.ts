import { Model } from 'mongoose';

export interface TAboutUs {
  aboutUs: string;
  isDelete: boolean;
}

export interface AboutModel extends Model<TAboutUs> {
  // eslint-disable-next-line no-unused-vars
  isAboutCustomId(id: string): Promise<TAboutUs>;
}
