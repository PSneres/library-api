import { dateRangesSchema } from "#schemas/date.schema";
import { findAllLoans } from "#services/loans.service";
import { getQueryValue } from "#utils/normalizeQueryValue";

export async function listLoans(req, res) {
    const query = req.query;
    
     
    const validQuerys = ['member_id', 'book_id,'];
    const querys =  validQuerys.map((key) => getQueryValue(query, key));
    const filter = Object.fromEntries(querys);
    
    const dateRanges = [
        {
            from: filter.craeted_from,
            to: filter.created_to
        },
        {
            from: filter.expires_from,
            to: filter.expires_to
        },
        {
            from: filter.returned_from,
            to: filter.returned_to
        }
    ];

    const result = dateRangesSchema.safeParse(dateRanges); 
    if (!result.success) {
        return res.status(400).json({
            error: 'Invalid date range provided.',
            details: result.error.issues
        });
    }

    filter.limit = Number(query.limit) || 20;
    filter.offset = Number(query.offset) || 0;
    filter.active_only = getQueryValue(query, 'active_only')[0].toLowerCase() === "true";

    const loans = await findAllLoans(filter)
    res.status(200).json(loans);
}