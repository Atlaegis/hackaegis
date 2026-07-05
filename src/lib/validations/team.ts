import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters").max(100),
  description: z.string().max(500).optional(),
});

export const joinTeamSchema = z.object({
  inviteCode: z.string().min(6, "Invalid invite code").max(20),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type JoinTeamInput = z.infer<typeof joinTeamSchema>;
