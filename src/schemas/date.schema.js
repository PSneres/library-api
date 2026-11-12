import * as z from "zod";

export const dateRangeSchema = z.object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional()
}).refine(
    ({ from, to }) => !from || !to || from <= to,
    { message: "Start date cannot be after end date." }
);