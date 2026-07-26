import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import gamesRouter from "./games";
import groupsRouter from "./groups";
import catalogRouter from "./catalog";
import adminRouter from "./admin";
import studioRouter from "./studio";
import socialRouter from "./social";
import systemRouter from "./system";

const router: IRouter = Router();

router.use(healthRouter);
router.use(systemRouter);
router.use(authRouter);
router.use(gamesRouter);
router.use(groupsRouter);
router.use(catalogRouter);
router.use(adminRouter);
router.use(studioRouter);
router.use(socialRouter);

export default router;
