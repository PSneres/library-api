import * as z from "zod";

export const memberSchema = z.object({
    name: z.string().trim().min(1).max(255),
    email: z.email().max(255),
    created_at: z.iso.date().optional(),
    max_loans: z.number().int().nonnegative().max(10),
});

export const membersSchema = z.array(memberSchema).min(1).max(100);