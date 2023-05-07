# Distributed Consensus Based Prime Number Deciding Application

- Uses PAXOS algorithm for consencus
- Uses Bully algorithm for deciding the coordinator

This application utilizes distributed nodes to reach a concensus on a number being prime or not using PAXOS.
A Service Registry has been used to help nodes find each other and communication efficiently. 


## Service Registry

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

## Use of Redis

To improve scalability, one approach taken was to use Redis to cache the service registry info to reduce load on Consul.

### Setting up Redis

First, install Redis: 

**MAKE SURE YOU HAVE DOCKER INSTALLED** - https://www.docker.com/get-started/

```bash
docker run -p 6379:6379 -it redis/redis-stack-server:latest
```

---

After doing all of this, proceed to setup the client app.
