import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import gamesRouter from "./games";
import groupsRouter from "./groups";
import catalogRouter from "./catalog";
import adminRouter from "./admin";
import studioRouter from "./studio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(gamesRouter);
router.use(groupsRouter);
router.use(catalogRouter);
router.use(adminRouter);
router.use(studioRouter);

export default router;
