import { z } from "zod";
import { EVALUATION_CRITERIA } from "@/lib/constants/rubric";

const criteriaKeys = EVALUATION_CRITERIA.map((c) => c.key);

export const criterionScoreSchema = z.object({
  criteriaKey: z.enum(criteriaKeys as [string, ...string[]]),
  score: z.number().min(1, "Score must be at least 1").max(10, "Score cannot exceed 10"),
  comment: z.string().optional(),
});

export const evaluationSchema = z
  .object({
    scores: z
      .array(criterionScoreSchema)
      .length(EVALUATION_CRITERIA.length, `All ${EVALUATION_CRITERIA.length} criteria must be scored`),
    strengths: z
      .string()
      .min(50, "Strengths feedback must be at least 50 characters"),
    weaknesses: z
      .string()
      .min(50, "Weaknesses feedback must be at least 50 characters"),
    recommendations: z.string().optional(),
    verdict: z.enum(["qualified", "eliminated"]),
    eliminationReason: z.string().optional(),
    internalNotes: z.string().optional(),
  })
  .refine(
    (data) =>
      data.verdict !== "eliminated" ||
      (data.eliminationReason && data.eliminationReason.length >= 30),
    {
      message: "Elimination reason is required (minimum 30 characters) when eliminating a team",
      path: ["eliminationReason"],
    }
  );

export type EvaluationInput = z.infer<typeof evaluationSchema>;
