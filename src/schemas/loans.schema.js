import * as z from "zod";

export const loanSchema = z.object({
    member_id: z.number().int().positive(),
    book_id: z.number().int().positive(),
    expires_in: z.string().regex(/^[1-9]\d*[dw]$/i)
})