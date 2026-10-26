import { Router } from 'express';

const router = Router();

router.get("/", (req, res) => {
    console.log("teste");
    res.status(200).json({ message: "API is running"});
})

export default router;