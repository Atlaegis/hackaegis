import { z } from "zod";

export const onboardingSchema = z.object({
  fullName: z.string().min(2, "Name is required").max(255),
  phone: z.string().min(10, "Valid phone number required").max(15).optional(),
  college: z.string().min(2, "College name is required").max(255),
  university: z.string().max(255).optional(),
  degree: z.string().max(100).optional(),
  branch: z.string().max(100).optional(),
  graduationYear: z.number().min(2020).max(2030).optional(),
  githubUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  portfolioUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  skills: z.array(z.string()).max(20).optional(),
  bio: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
