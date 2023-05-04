# Distributed Consensus Based Prime Number Deciding Application

- Uses PAXOS algorithm for consencus
- Uses Bully algorithm for deciding the coordinator

This application utilizes distributed nodes to reach a concensus on a number being prime or not using PAXOS.
A Service Registry has been used to help nodes find each other and communication efficiently. 


## Server Registry

The service registry that has been used is Consul.

### Installation

To install Consul, run the following commands:

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/consul
```

### Configuring Consul

Open a terminal and launch a Consul agent. The agent is responsible for managing services. Run the command below

```
consul agent -dev
```

Next, visit this link to view the Consul UI - http://localhost:8500/ui



