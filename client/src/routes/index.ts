import { Router } from "express";
import { getHome, getNodeInformation, health, electNewLeader, processElectionRequest, obtainNewRole, processAcceptorAction, processLearnerAction, processProposerAction } from "./functions";

const routes = Router();

routes.get("/", getHome);
routes.get('/health', health)
routes.get('/information', getNodeInformation);
routes.post('/election', processElectionRequest);
routes.post('/election/completed', electNewLeader);
routes.post('/alerts/role', obtainNewRole);
routes.post('/actions/proposer', processProposerAction);
routes.post('/actions/learner', processLearnerAction);
routes.post('/actions/acceptor', processAcceptorAction);

export default routes;