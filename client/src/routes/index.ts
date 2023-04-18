import { Router } from "express";
import { getAllInstances, getHome, getNodeInformation, health, isReadyForElection, electNewLeader, processElectionRequest } from "./functions";

const routes = Router();

routes.get("/", getHome);
routes.get('/apps', getAllInstances)
routes.get('/health', health)
routes.get('/information', getNodeInformation);
routes.get('/election', processElectionRequest);
routes.get('/election/ready', isReadyForElection);
routes.post('/election/completed', electNewLeader);

export default routes;