import { z } from "zod";

const AboutValidationSchema = z.object({
  body: z.object({
    aboutUs: z.string({message: "about us is required" }),
  }),
});

const settingValidationSchema={
    AboutValidationSchema
}

export default settingValidationSchema;
