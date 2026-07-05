import { z } from "zod";

const emptyToUndefined = z.literal("").transform(() => undefined);

const optionalString = z.string().optional().or(emptyToUndefined);
const optionalUrl = z.string().url("Invalid URL").optional().or(emptyToUndefined);

export const onboardingSchema = z.object({
  fullName: z.string().min(2, "Name is required").max(255),
  phone: z.string().min(10, "Valid phone number required").max(15).optional().or(emptyToUndefined),
  college: z.string().min(2, "College name is required").max(255),
  university: optionalString,
  degree: optionalString,
  branch: optionalString,
  graduationYear: z.number().min(2020).max(2030).optional().or(z.nan().transform(() => undefined)),
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  skills: z.array(z.string()).max(20).optional(),
  bio: optionalString,
  city: optionalString,
  state: optionalString,
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
