# Distributed Consensus Based Prime Number Deciding Application

- Uses PAXOS algorithm for consencus
- Uses Bully algorithm for deciding the coordinator

Set up project by installing `node_modules` using the command: 

```
npm install
```

This application utilizes distributed nodes to reach a concensus on a number being prime or not using PAXOS. Therefore, to allow node-node communication, a service discovery service has been used.

