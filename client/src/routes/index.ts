import { Router } from "express";
import { getHome, getNodeInformation, health, electNewLeader, processElectionRequest, obtainNewRole, registerProposerCount, checkPrimeInProposer, acceptResponseToLearnerFromAcceptor, acceptResponseInAcceptor } from "./functions";

const routes = Router();

routes.get("/", getHome);
routes.get('/health', health)
routes.get('/information', getNodeInformation);

routes.post('/election', processElectionRequest);
routes.post('/election/completed', electNewLeader);

routes.post('/alerts/role', obtainNewRole);
routes.post('/alerts/learner/proposer-count', registerProposerCount);

routes.post('/actions/learner/accept-response', acceptResponseToLearnerFromAcceptor);
routes.post('/actions/acceptor/accept-response', acceptResponseInAcceptor);
routes.post('/actions/proposer/checks/prime', checkPrimeInProposer);

export default routes;