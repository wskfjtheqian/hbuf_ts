import {createHash} from "node:crypto";
import {createServer, Server} from "node:http";
import {Socket} from "node:net";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/**
 * TestWsServer 极简 WebSocket 测试服务器（无第三方依赖）：
 * 完成握手后解析客户端帧（masked），将完整消息广播给其余连接；支持 ping→pong、close 与
 * 126/127 扩展长度及分片重组。仅用于测试 RPC 传输链路。
 */
export class TestWsServer {
    private server: Server
    private sockets: Set<Socket> = new Set()
    private buffer: Map<Socket, Buffer> = new Map()
    private fragmented: Map<Socket, Buffer> = new Map()

    constructor() {
        this.server = createServer((req, res) => {
            res.writeHead(404)
            res.end()
        })
        this.server.on("upgrade", (req, socket) => {
            const key = req.headers["sec-websocket-key"]
            if (!key) {
                socket.destroy()
                return
            }
            const accept = createHash("sha1").update(key + WS_GUID).digest("base64")
            socket.write(
                "HTTP/1.1 101 Switching Protocols\r\n" +
                "Upgrade: websocket\r\n" +
                "Connection: Upgrade\r\n" +
                "Sec-WebSocket-Accept: " + accept + "\r\n\r\n",
            )
            this.sockets.add(socket)
            socket.on("close", () => {
                this.sockets.delete(socket)
                this.buffer.delete(socket)
                this.fragmented.delete(socket)
            })
            this.handle(socket)
        })
    }

    public listen(port = 0): Promise<number> {
        return new Promise((resolve) => {
            this.server.listen(port, "127.0.0.1", () => {
                resolve((this.server.address() as {port: number}).port)
            })
        })
    }

    public close(): Promise<void> {
        for (const s of this.sockets) {
            s.destroy()
        }
        return new Promise((resolve) => this.server.close(() => resolve()))
    }

    /** 向指定连接发送一条二进制消息（客户端 onmessage 走 Blob→ArrayBuffer 路径）。 */
    public send(socket: Socket, data: Uint8Array | string): void {
        const payload = typeof data === "string" ? new TextEncoder().encode(data) : data
        this.sendFrame(socket, 0x2, payload)
    }

    private handle(socket: Socket) {
        socket.on("data", (chunk) => {
            let buf = this.buffer.get(socket)
            buf = buf ? Buffer.concat([buf, chunk]) : chunk
            for (; ;) {
                if (buf.length < 2) {
                    this.buffer.set(socket, buf)
                    return
                }
                const b0 = buf[0]
                const b1 = buf[1]
                const fin = (b0 & 0x80) !== 0
                const opcode = b0 & 0x0f
                const masked = (b1 & 0x80) !== 0
                let len = b1 & 0x7f
                let offset = 2
                if (len === 126) {
                    if (buf.length < 4) {
                        this.buffer.set(socket, buf)
                        return
                    }
                    len = buf.readUInt16BE(2)
                    offset = 4
                } else if (len === 127) {
                    if (buf.length < 10) {
                        this.buffer.set(socket, buf)
                        return
                    }
                    len = Number(buf.readBigUInt64BE(2))
                    offset = 10
                }
                let maskKey: Buffer | undefined
                if (masked) {
                    if (buf.length < offset + 4) {
                        this.buffer.set(socket, buf)
                        return
                    }
                    maskKey = buf.subarray(offset, offset + 4)
                    offset += 4
                }
                if (buf.length < offset + len) {
                    this.buffer.set(socket, buf)
                    return
                }
                let payload = buf.subarray(offset, offset + len)
                buf = buf.subarray(offset + len)

                if (masked && maskKey) {
                    const unmasked = Buffer.alloc(payload.length)
                    for (let i = 0; i < payload.length; i++) {
                        unmasked[i] = payload[i] ^ maskKey[i % 4]
                    }
                    payload = unmasked
                }

                switch (opcode) {
                    case 0x1: // text
                    case 0x2: // binary
                        if (!fin) {
                            const prev = this.fragmented.get(socket)
                            this.fragmented.set(socket, prev ? Buffer.concat([prev, payload]) : Buffer.from(payload))
                        } else {
                            const prev = this.fragmented.get(socket)
                            const msg = prev ? Buffer.concat([prev, payload]) : payload
                            this.fragmented.delete(socket)
                            this.onMessage(socket, new Uint8Array(msg))
                        }
                        break
                    case 0x0: // continuation
                        if (this.fragmented.has(socket)) {
                            const prev = this.fragmented.get(socket)!
                            if (fin) {
                                this.fragmented.delete(socket)
                                this.onMessage(socket, new Uint8Array(Buffer.concat([prev, payload])))
                            } else {
                                this.fragmented.set(socket, Buffer.concat([prev, payload]))
                            }
                        }
                        break
                    case 0x9: // ping
                        this.sendFrame(socket, 0xA, new Uint8Array(payload))
                        break
                    case 0xA: // pong
                        break
                    case 0x8: // close
                        socket.destroy()
                        return
                    default:
                        break
                }
            }
        })
    }

    /** 收到完整消息：广播给其余所有连接。 */
    private onMessage(socket: Socket, data: Uint8Array) {
        for (const s of this.sockets) {
            if (s !== socket && !s.destroyed) {
                this.send(s, data)
            }
        }
    }

    private sendFrame(socket: Socket, opcode: number, payload: Uint8Array) {
        const len = payload.length
        let header: Uint8Array
        if (len < 126) {
            header = new Uint8Array(2)
            header[1] = len
        } else if (len < 65536) {
            header = new Uint8Array(4)
            header[1] = 126
            header[2] = (len >> 8) & 0xff
            header[3] = len & 0xff
        } else {
            header = new Uint8Array(10)
            header[1] = 127
            const big = BigInt(len)
            for (let i = 0; i < 8; i++) {
                header[9 - i] = Number((big >> BigInt(8 * i)) & 0xffn)
            }
        }
        header[0] = 0x80 | opcode
        socket.write(Buffer.concat([Buffer.from(header), Buffer.from(payload)]))
    }
}
