# Client

Set up project by installing `node_modules` using the command: 

```
npm install
```

This application utilizes distributed nodes to reach a concensus on a number being prime or not using PAXOS.

## Shell Script

There is a script written that will spawn the clients and begin the application.
Run the script as shown below.

### Make Script Executable 

Open terminal in client directory and run following command 

```
chmod +x spin-up-clients.sh
```

### Update project path

Currently script has a variable as shown below.

```
PROJECT_ROOT=<<PATH-TO-CLIENT>>
```

Update the `PROJECT_ROOT` with the absolute path to the client directory.

### Run script 

Run the script using the command

```
./spin-up-clients.sh
```