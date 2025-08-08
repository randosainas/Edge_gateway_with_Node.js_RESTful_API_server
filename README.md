# Overview.

This is a Fastly Edge gateway and Node.js server with a RESTful API to serve clients.

The edge application is a gateway since it:
    - filters requests i.e. url and traffic routing applied 
    - modifies requests i.e. secrets injection to headers
    - autheticates
    - performance and latency-minded responses i.e. static pages serving
You may claim the gateway is a reverse proxy, since it hides the backend identity.

Fastly compute is the framework that is used here to enable an efficient content delivery over the network (CDN).

## Purpose
Purpose of the edge JavaScript is to enable low latency global coverage
 serving either an API or browser frontend with a static Html or dynamic Json file.
Purpose of the backend Typescript is to run a server loop that listens on HTTP
requests and serves responses while routing the requested methods or URL paths.

## Credentials
Credentials management is done in Fastly secret-store. Backend access is enabled only with a key embedded in the request object header. Backend logs requests and blocks unauthorized requests securely.

For sandbox"ing/ play" I have gave duality to choose who serves the client with static html.

Methods failures are protected according to DOM standard ([WHATWG DOM](https://dom.spec.whatwg.org)) and ([MDN Web docs](https://developer.mozilla.org/en-US/docs/Web/API))

## API
Is it really a RESTful/resting API? 
    - stateless, since toggle state is kept on the backend. And used
        fetch() API logic to manage requests and responses
    - layered system, an architecture of servers

## Cloud VM
For static public ip I used the most minimal cloud VM offered by Google Cloud. The service is called Compute Engine and the machine type is f1-micro (1 vCPUs, 614 MB Memory), presumably will be depracated soon to make room for E2-s. On the VM I added a firewall rule to open the 3000 port.

## Project build sequence:
1. `mkdir <project_name> && cd <project_name> && npm create @fastly/compute`
2. `node_modules/.bin/fastly compute build`
3. `node_modules/.bin/fastly compute deploy --token <>`
4. Create is prompted and add a backend via stdin
5. Get backend server node packages in backend dir, `npm i --save-dev @types/node`
6. Create a fastly secret-store in Fastly CLI `fastly secret-store create --name=NAME`
7. Add credential to secret-store `fastly secret-store-entry create --name=NAME --store-id=STORE-ID`
8. make a .env with a credential key and value pair FASTLY_SECRET=

## JavaScript development stage
1. `node_modules/.bin/fastly compute publish --token <>`
2. `node_modules/.bin/fastly log-tail --service-id <>  --token <>`

* Token is the Fastly CLI API credential.

## Notes
tsc API_bacend.ts to compile to API_backend.js
nodejs used to run the server, node API_backend.js
Credentials store linking to a FAstly service can be done with Fastly API or UI not CLI.
I am using dotenv to read backend .env, `npm install dotenv`
Used apt on the VM and allowed only ssh to access it. `sudo apt install nodejs npm`
