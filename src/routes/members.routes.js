import { Router } from "express";
import { addMember, addMembers, getMember, listMembers, modifyMember } from "#controllers/members.controller"
import { validateMember, validateMemberId, validateMemberPatch, validateMembers } from "#middlewares/members.middleware";
import { verifyToken } from "#middlewares/auth.middleware";

const router = Router();

router.get('/:id', verifyToken, validateMemberId, getMember);
router.get('/', verifyToken, listMembers);

router.post('/', verifyToken, validateMember, addMember);
router.post('/bulk', verifyToken, validateMembers, addMembers);

router.patch('/:id', verifyToken, validateMemberId, validateMemberPatch, modifyMember);

export default router;