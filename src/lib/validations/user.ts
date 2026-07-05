import { z } from "zod";

const emptyToUndefined = z.literal("").transform(() => undefined);

const optionalString = z.string().optional().or(emptyToUndefined);
const optionalUrl = z.string().url("Invalid URL").optional().or(emptyToUndefined);

export const onboardingSchema = z.object({
  fullName: z.string().min(2, "Name is required").max(255),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Phone must be 10-15 digits").optional().or(emptyToUndefined),
  college: z.string().min(2, "College name is required").max(255),
  university: optionalString,
  degree: optionalString,
  branch: optionalString,
  graduationYear: z.number().min(2020).max(2030).optional().or(z.nan().transform(() => undefined)),
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  skills: z.array(z.string().max(50)).max(20).optional(),
  bio: optionalString,
  city: optionalString,
  state: optionalString,
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
