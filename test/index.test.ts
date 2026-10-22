import {test} from "node:test";
import assert from "node:assert";
import {createServer} from "node:http";
import {AddressInfo} from "node:net";
import {
    Client,
    Data,
    FetchClient,
    Handler,
    Method,
    Option,
    RequestType,
    ResponseType,
    Result,
    Server,
} from "../src";

class TextRequest extends Data {
    hello: string = ""

    toMap(): Record<string, any> {
        return this;
    }
}

class TextResponse extends Data {
    hello: string = ""

    toMap(): Record<string, any> {
        return this;
    }

    static fromMap(map: Record<string, any>): TextResponse {
        const ret = new TextResponse();
        ret.hello = map.hello;
        return ret;
    }
}

test("http client", async () => {
    // 服务端：注册 handler，返回 Result 包装的响应（与客户端 invoke 的 Result 约定一致）
    const server = new Server()
    const method: Method = {
        id: 1,
        name: "method",
        from: (map: Record<string, any>) => Object.assign(new TextRequest(), map),
        handler: async (req: RequestType): Promise<ResponseType> => {
            const ret = new TextResponse()
            ret.hello = "hello " + (req as TextRequest).hello
            return ret
        },
        withContext: (opt?: Option) => opt,
    }
    server.register(1, "service", [method])

    const httpServer = createServer(async (req, res) => {
        const chunks: Buffer[] = []
        for await (const chunk of req) {
            chunks.push(chunk)
        }
        const body = JSON.parse(Buffer.concat(chunks).toString("utf-8"))
        const resp = await server.response(req.url ?? "", body)
        res.setHeader("Content-Type", "application/octet-stream")
        res.end(JSON.stringify(new Result(0, "ok", resp as Data).toMap()))
    })
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve))
    const port = (httpServer.address() as AddressInfo).port

    const http = new FetchClient(`http://127.0.0.1:${port}`, {})
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
    req.hello = "world"

    const res = await client.invoke<TextResponse>(1, "service", "method", req, TextResponse.fromMap)
    assert.strictEqual(res.hello, "hello world")

    await new Promise<void>((resolve) => {
        httpServer.close(() => resolve())
        httpServer.closeAllConnections()
    })
})
