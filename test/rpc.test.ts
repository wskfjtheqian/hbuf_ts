import {test} from "node:test";
import {createServer} from "node:http";
import {AddressInfo} from "node:net";
import {
    Client,
    FetchClient,
    HData,
    Method,
    NewHBufDecoder,
    NewHBufEncode,
    Option,
    RequestType,
    ResponseType,
    Result,
    Server,
    WebSocketClient,
} from "../src";
import {buildFull, deepEq, HBufTestTs, hbTestDesc} from "./hbuf128";
import {TestWsServer} from "./ws_server";

// 服务端 handler：HBufTestTs（128 字段）作为参数与返回值，回显并修改两个字段
// v1 为 int8（[-128,127]），自增会溢出，改用自减保证类型范围内
const echoMethod: Method = {
    id: 1,
    name: "method",
    desc: hbTestDesc,
    handler: async (req: RequestType): Promise<ResponseType> => {
        const v = req as HBufTestTs
        v.v1 -= 1
        v.v19 = "echo:" + v.v19
        return v
    },
    withContext: (opt?: Option) => opt,
}

// 期望返回值：与请求同结构 + handler 的修改
function echoExpect(src: HBufTestTs): HBufTestTs {
    const exp = buildFull()
    exp.v1 = src.v1 - 1
    exp.v19 = "echo:" + src.v19
    return exp
}

test("HTTP RPC: HBufTestTs 128 字段作为参数与返回值（JSON codec）", async () => {
    const server = new Server()
    server.register(1, "service", [echoMethod])

    const httpServer = createServer(async (req, res) => {
        const chunks: Buffer[] = []
        for await (const chunk of req) {
            chunks.push(chunk)
        }
        const body = Buffer.concat(chunks)
        const resp = await server.response(req.url ?? "", new Uint8Array(body))
        const buf = server.encode(new Result(0, "ok", resp as HData))
        res.end(new Uint8Array(buf))
    })
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve))
    const port = (httpServer.address() as AddressInfo).port

    const http = new FetchClient(`http://127.0.0.1:${port}`)
    const client = new Client(http.request.bind(http))

    const src = buildFull()
    const res = await client.invoke<HBufTestTs>(1, "service", "method", src, hbTestDesc)
    deepEq(res, echoExpect(src))

    await new Promise<void>((resolve) => {
        httpServer.close(() => resolve())
        httpServer.closeAllConnections()
    })
})

test("HTTP RPC: HBufTestTs 128 字段作为参数与返回值（HBuf codec）", async () => {
    const server = new Server({encode: NewHBufEncode(), decode: NewHBufDecoder()})
    server.register(1, "service", [echoMethod])

    const httpServer = createServer(async (req, res) => {
        const chunks: Buffer[] = []
        for await (const chunk of req) {
            chunks.push(chunk)
        }
        const body = Buffer.concat(chunks)
        const resp = await server.response(req.url ?? "", new Uint8Array(body))
        const buf = server.encode(new Result(0, "ok", resp as HData))
        res.end(new Uint8Array(buf))
    })
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve))
    const port = (httpServer.address() as AddressInfo).port

    const http = new FetchClient(`http://127.0.0.1:${port}`, {encode: NewHBufEncode(), decode: NewHBufDecoder()})
    const client = new Client(http.request.bind(http))

    const src = buildFull()
    const res = await client.invoke<HBufTestTs>(1, "service", "method", src, hbTestDesc)
    deepEq(res, echoExpect(src))

    await new Promise<void>((resolve) => {
        httpServer.close(() => resolve())
        httpServer.closeAllConnections()
    })
})

test("WebSocket RPC: HBufTestTs 128 字段作为参数与返回值", async () => {
    // 极简 WebSocket 测试服务器：广播转发两端消息
    const hub = new TestWsServer()
    const port = await hub.listen()

    // 服务端：WebSocketClient 携带 Server 处理 RPC 请求
    const server = new Server()
    server.register(1, "service", [echoMethod])
    const wsServerSide = new WebSocketClient(`ws://127.0.0.1:${port}`, server)
    await wsServerSide.connect()

    // 客户端：Client.invoke 经 WebSocket 传输
    const wsClient = new WebSocketClient(`ws://127.0.0.1:${port}`)
    await wsClient.connect()
    const client = new Client(wsClient.request.bind(wsClient))

    const src = buildFull()
    const res = await client.invoke<HBufTestTs>(1, "service", "method", src, hbTestDesc)
    deepEq(res, echoExpect(src))

    wsClient.close()
    wsServerSide.close()
    await hub.close()
})
