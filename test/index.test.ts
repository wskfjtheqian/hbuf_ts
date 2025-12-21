import {test} from "node:test";
import {HttpClient} from "../src/hrpc/http";
import {BufferType, Client, Option, Handler, Request, RequestType, ResponseType} from "../src/hrpc/rpc";
import {Data} from "../src/hbuf/data";


test.test("http client", (t) => {
    const http = new HttpClient("http://localhost:8080", {
        middleware: [
            (next: Request): Request => {
                return async (path: string, notification: boolean, callback: () => BufferType): Promise<ArrayBuffer> => {
                    return await next(path, notification, callback)
                }
            }
        ]
    })
    const client = new Client(http.request.bind(http), {
        middleware: [
            (next: Handler): Handler => {
                return async (req: RequestType, opt?: Option): Promise<ResponseType> => {
                    return await next(req, opt)
                }
            }
        ]
    })

    client.Invoke(1, "service", "method", "tag", new Data(), "data").then(res => {
        console.log(res)
    })
})
