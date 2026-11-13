import { findById, insertMember, bulkInsertMembers, updateMember } from "#repositories/members.repository";
import { getQueryValue } from "#utils/normalizeQueryValue";
import { dateRangeSchema } from "#schemas/date.schema";
import { findAllMembers, safeUpdateMember } from "#services/members.service";

export async function getMember(req, res) {
    const member = await findById(req.params.id);
    res.status(200).json(member);
}

export async function listMembers(req, res) {
    const query = req.query;

    const validQuerys = ['name', 'email', 'max_loans', 'created_to', 'created_from'];
    const querys =  validQuerys.map((key) => getQueryValue(query, key));

    const filter = Object.fromEntries(querys);

    const dateRange = {
        from: filter.created_from || undefined,
        to: filter.created_to || undefined
    }

    const result = dateRangeSchema.safeParse(dateRange);
    if (!result.success) {
        return res.status(400).json({
            error: 'Invalid date range provided.',
            details: result.error.issues
        });
    }
    
    filter.limit = Number(query.limit) || 20;
    filter.offset = Number(query.offset) || 0;
    
    const members = await findAllMembers(filter);
    res.status(200).json(members);
}

export async function addMember(req, res)  {
    const member = await insertMember(req.body);
    res.status(201).json(member);
}

export async function addMembers(req, res) {
    const members = await bulkInsertMembers(req.body)
    res.status(201).json(members);
}

export async function modifyMember(req, res) {
    const result = await safeUpdateMember(req.params.id, req.body);
    
    if (!result.success) {
        return res.status(result.status).json({ error: result.error });
    }

    res.status(result.status).json(result.data);
}