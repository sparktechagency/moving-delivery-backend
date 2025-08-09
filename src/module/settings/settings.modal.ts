import { Schema, model } from "mongoose";
import { AboutModel, TAboutUs } from "./settings.interface";


const AboutUsSchema = new Schema<TAboutUs, AboutModel>(
  {
    aboutUs: {
      type: String,
      required: [true, "About Us content is required"],
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

AboutUsSchema.statics.isAboutCustomId = async function (id: string) {
  return this.findById(id);
};

AboutUsSchema.pre("find", function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});
AboutUsSchema.pre("findOne", function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});
AboutUsSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

export const aboutus = model<TAboutUs, AboutModel>("aboutus", AboutUsSchema);

