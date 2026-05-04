import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studySessionsRouter from "./study-sessions";
import cardsRouter from "./cards";
import collectionRouter from "./collection";
import statsRouter from "./stats";
import studyMaterialsRouter from "./study-materials";
import flashcardsRouter from "./flashcards";
import quizzesRouter from "./quizzes";
import profilesRouter from "./profiles";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studySessionsRouter);
router.use(cardsRouter);
router.use(collectionRouter);
router.use(statsRouter);
router.use(studyMaterialsRouter);
router.use(flashcardsRouter);
router.use(quizzesRouter);
router.use(profilesRouter);

export default router;
