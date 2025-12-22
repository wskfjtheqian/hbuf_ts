import {test} from "node:test";
import {HttpClient} from "../src/hrpc/http";
import {Client, Handler, Option, RequestType, ResponseType} from "../src/hrpc/rpc";
import {Data} from "../src/hbuf/data";


class TextRequest extends Data {
    toMap(tag: string): Record<string, any> {
        return this;
    }

}

class TextResponse extends Data {
    hello: string = ""

    toMap(tag: string): Record<string, any> {
        return this;
    }

    static fromMap(map: Record<string, any>): TextResponse {
        const ret = new TextResponse();
        ret.hello = map.hello;
        return ret;
    }
}

test.test("http client", (t) => {
    const http = new HttpClient("http://localhost:8080", {})

    const client = new Client(http.request.bind(http), {
        middleware: [
            (next: Handler): Handler => {
                return async (req: RequestType, opt?: Option): Promise<ResponseType> => {
                    return await next(req, opt)
                }
            }
        ]
    })


    const req = new TextRequest();

    client.invoke(1, "service", "method", "tag", req, TextResponse.fromMap).then(res => {
        console.log(res)
    })
})
