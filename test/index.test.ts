import {test} from "node:test";
import assert from "node:assert";
import {createServer} from "node:http";
import {AddressInfo} from "node:net";
import {
    Client,
    DataDescriptor,
    Descriptor,
    FetchClient,
    FieldDesc,
    HData,
    Handler,
    Method,
    Option,
    RequestType,
    ResponseType,
    Result,
    Server,
    StringDescriptor,
} from "../src";

class TextRequest implements HData {
    hello: string = ""

    descriptors(): Descriptor {
        return textRequestDesc
    }
}

const textRequestDesc: DataDescriptor = new DataDescriptor(
    () => new TextRequest(),
    new Map<number, FieldDesc>([
        [1, {name: "hello", desc: new StringDescriptor(), get: (o: TextRequest) => o.hello, set: (o: TextRequest, v: string) => o.hello = v}],
    ]),
)

class TextResponse implements HData {
    hello: string = ""

    descriptors(): Descriptor {
        return textResponseDesc
    }
}

const textResponseDesc: DataDescriptor = new DataDescriptor(
    () => new TextResponse(),
    new Map<number, FieldDesc>([
        [1, {name: "hello", desc: new StringDescriptor(), get: (o: TextResponse) => o.hello, set: (o: TextResponse, v: string) => o.hello = v}],
    ]),
)

test("http client", async () => {
    // 服务端：注册 handler（请求按 desc 解码），响应由胶水层包装为 Result 编码
    const server = new Server()
    const method: Method = {
        id: 1,
        name: "method",
        desc: textRequestDesc,
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
        const body = Buffer.concat(chunks)
        // 原始字节直接交给 Server 按描述符解码，响应包装为 Result 编码
        const resp = await server.response(req.url ?? "", new Uint8Array(body))
        const buf = server.encode(new Result(0, "ok", resp as HData))
        res.setHeader("Content-Type", "application/octet-stream")
        res.end(new Uint8Array(buf))
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

    const res = await client.invoke<TextResponse>(1, "service", "method", req, textResponseDesc)
    assert.strictEqual(res.hello, "hello world")

    await new Promise<void>((resolve) => {
        httpServer.close(() => resolve())
        httpServer.closeAllConnections()
    })
})
