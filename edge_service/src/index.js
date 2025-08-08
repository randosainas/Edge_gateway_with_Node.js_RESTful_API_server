import { env } from "fastly:env";
import { SecretStore } from "fastly:secret-store";
import { includeBytes } from "fastly:experimental";

// Load a static file as a Uint8Array at compile time.
const welcomePage = includeBytes("./static/index.html");
const testPage = includeBytes("./static/test.html");

const contentHtml = { "Content-Type": "text/html; charset=utf-8" };
const contentJson = { "Content-Type": "application/json; charset=utf-8" };

async function getCredentials(name) {
  const credentials = new SecretStore('credentials');
  const fastlySecretObj = await credentials.get(name);
  return await fastlySecretObj.plaintext();
}

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

/*
 * @glance      Compose a palin Javascript object literal, where headers
                are sanitized for each request to backend.
                if : skips psedo headers like method: authority in HTTP/2.
                Entries() retuns a array.
                GET and HEAD do not have a body or its ignored mostly. Read the 
                body from the req with .text(), stream logic here.
*/

async function getPlainObj(req) {
  //get clean headers first
  const FASTLY_SECRET = await getCredentials("FASTLY_SECRET");
  const newHeaders = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (!key.startsWith(':')) newHeaders.set(key, value);
  }
  newHeaders.set("x-fastly-secret", FASTLY_SECRET);

  console.log("Outgoing headers to backend:");
  for (const [key, value] of newHeaders.entries()) {
    console.log(key, ":", value);
  }

  let body;
  if (req.method !== "GET" && req.method !== 'HEAD') {
    body = await req.clone().text();
  }
  const plainObj = {
    method: req.method,
    headers: newHeaders,
    ... (body ? { body } : {})
  };
  return (plainObj);
}

function errorFetching(backendUserResponse, jsonOut, statusNo) {
  if (backendUserResponse)
    console.log(`Backend returned ${backendUserResponse.status} ${backendUserResponse.statusText}`);
  if (jsonOut && statusNo)
    return new Response(JSON.stringify({ error: "Backend error", status: backendUserResponse.status }),
      {
        status: backendUserResponse.status,
        headers: new Headers(contentJson),
      });
  else if (statusNo !== 404)
    return new Response("Internal proxy error", { status: statusNo });
  else
    return backendUserResponse;
}

/* 
 * @glance    Fetch api event listener to defines request handling logic.
              Routing based on the request properties (method or path).
              Get the client request. Decide weather to give a html file
              or to forward to back end take the respose and serve the client
              a json file. Await lets the main thread continue and waits for 
              the response prior return call.
              includes() method makes case sensitive search in string.
              json() returns a new Response object that contains JSON in body.
*/

async function handleRequest(event) {//return a promise, can finish
  //later not synchronous.
  const req = event.request;

  // Log service version
  console.log("FASTLY_SERVICE_VERSION:", env('FASTLY_SERVICE_VERSION') || 'local');

  if (["PUT", "PATCH", "DELETE"].includes(req.method)) {
    return new Response("This method is not allowed", {
      status: 405,
    });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  if (url.pathname === "/toggle") {
    const backendRequest = new Request("https://35.231.102.104" + url.pathname, await getPlainObj(req));
    try {
      const backendResponse = await fetch(backendRequest, { backend: "backend_1" });
      return backendResponse;
    }
    catch (err) {
      console.log("Backend fetch failed:", err.toString());
      return new Response("Internal proxy error", { status: 502 });
    }
  }
  //RESTful API functionality
  if (path.startsWith('/user/')) {
    const backendUserRequest = new Request("https://35.231.102.104" + url.pathname, await getPlainObj(req));
    try {
      //const backendUserResponse = new Response("", { status: 500 });//simulate fetch fail
      const backendUserResponse = await fetch(backendUserRequest, { backend: "backend_1" });
      if (!backendUserResponse.ok)//ie status 200-299
        return errorFetching(backendUserResponse, 1, 1);

      const jsonData = await backendUserResponse.json();
      return new Response(JSON.stringify(jsonData),
        {
          status: 200,
          headers: new Headers(contentJson),
        });
    }
    catch (err) {
      console.log("Backend API fetch failed:", err.toString());
      return errorFetching(new Response(""), 0, 502);
    }
  }
  if (url.pathname === "/") {
    return new Response(welcomePage,
      {
        status: 200,
        headers: new Headers(contentHtml),
      });
  }
  if (url.pathname === "/test") {
    return new Response(testPage,
      {
        status: 200,
        headers: new Headers(contentHtml),
      });
  }

  /*
   * @glance    Fallback handler. A generic proxy, all that was not found matching
                while routing (if url.pathname ...) is handed to the backend.
                This is an alternative to sending 404 for all other cases.
                ie
                return new Response("The page you requested could not be found", {
                  status: 404, });*
                Try block need, backend can fail also throwing, VM not reachable, DNS resolution fails, timeout ...
  */

  const backendRequest = new Request("https://35.231.102.104" + url.pathname, await getPlainObj(req));
  //const backendResponse = new Response("", { status: 500 });//simulate fetch fail
  try {
    const backendResponse = await fetch(backendRequest,
      {
        backend: "backend_1"
      });
    if (!backendResponse.ok)//ie 404
      return errorFetching(backendResponse, 0, backendResponse.status);
  }
  catch (err) {
    console.log("Backend generic proxy fetch failed:", err.toString());
    return errorFetching(new Response(""), 0, 502);
  }
}
