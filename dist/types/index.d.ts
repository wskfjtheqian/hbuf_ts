import { Client, Error, Result, Server } from "./hrpc/rpc";
import { HttpClient } from "./hrpc/http";
import { Data } from "./hbuf/data";
declare const _default: {
    Data: typeof Data;
    Client: typeof Client;
    HttpClient: typeof HttpClient;
    Server: typeof Server;
    Error: typeof Error;
    Result: typeof Result;
};
export default _default;
