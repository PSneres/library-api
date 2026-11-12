import { existsMember } from "#repositories/members.repository";
import { memberSchema, membersSchema} from "#schemas/members.schema";

export async function validateMemberId(req, res,next) {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid id provided"  });
    }

    const hasMember = await existsMember(id);
    if (!hasMember.exists) {
        return res.status(404).json({ error: "Member not found" });
    }

    next();
}

export function validateMember(req, res, next) {
    const result = memberSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            error: 'Invalid member data',
            details: result.error.issues
        });
    }

    req.body = result.data;
    next();
}

export function validateMembers(req, res, next) {
    const result = membersSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            error: 'Invalid members data',
            details: result.error.issues
        });
    }

    req.body = result.data;
    next();
}

export function validateMemberPatch(req, res, next)  {
    const patchMemberSchema = memberSchema
    .omit({ created_at: true })
    .strict()
    .partial()
    .refine(data => Object.keys(data).length > 0, { message: 'At least one field is required.' });

    const result = patchMemberSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            error: 'Invalid or missing member fields.',
            details: result.error.issues
        });
    }

    req.body = result.data;

    next();
}