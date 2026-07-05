import { z } from "zod";

export const submissionSchema = z.object({
  projectTitle: z.string().min(3, "Project title required").max(255),
  projectDescription: z.string().min(20, "Description must be at least 20 characters").max(2000),
  githubUrl: z
    .string()
    .url("Invalid URL")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return parsed.hostname === "github.com" || parsed.hostname.endsWith(".github.com");
        } catch { return false; }
      },
      "Must be a GitHub URL"
    ),
  deploymentUrl: z.string().url("Invalid URL").optional().or(z.literal("").transform(() => undefined)),
  demoVideoUrl: z.string().url("Invalid URL").optional().or(z.literal("").transform(() => undefined)),
  pptUrl: z.string().url("Invalid URL").optional().or(z.literal("").transform(() => undefined)),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;
