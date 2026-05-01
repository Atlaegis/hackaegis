import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import codesRouter from "./codes";
import teamsRouter from "./teams";
import pollsRouter from "./polls";
import votesRouter from "./votes";
import resultsRouter from "./results";
import eventRouter from "./event";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(codesRouter);
router.use(teamsRouter);
router.use(pollsRouter);
router.use(votesRouter);
router.use(resultsRouter);
router.use(eventRouter);
router.use(adminRouter);

export default router;
