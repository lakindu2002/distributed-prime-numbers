import { Router } from "express";
import { getHome, getNodeInformation, health, electNewLeader, processElectionRequest, obtainNewRole } from "./functions";

const routes = Router();

routes.get("/", getHome);
routes.get('/health', health)
routes.get('/information', getNodeInformation);
routes.post('/election', processElectionRequest);
routes.post('/election/completed', electNewLeader);
routes.post('/alerts/role', obtainNewRole);

export default routes;