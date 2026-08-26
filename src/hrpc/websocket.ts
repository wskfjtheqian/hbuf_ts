import {Data, FromMap} from "../hbuf/data";
import {Decoder, Encoder, NewJsonDecoder, NewJsonEncode, Option, RequestType, ResponseType, Server} from "./rpc";


export enum RpcType {
    Request = 0,
    Response = 1,
    Notification = 2,
    Ping = 3,
    Pong = 4,
}

export class WebSocketData {
    type: RpcType
    header?: Record<string, string[]>
    data?: ArrayBuffer | Data | void
    id?: bigint
    path?: string
    status?: number

    constructor(type: RpcType, id?: bigint, path?: string, data?: ArrayBuffer | Data) {
        this.type = type;
        this.id = id;
        this.path = path;
    }

    public toMap(tag: string): Record<string, any> {
        return {
            type: this.type,
            header: this.header,
            id: this.id?.toString(),
            path: this.path,
            status: this.status,
            data: this.data,
        }
    }

    public static fromMap(map: Record<string, any>, tag: string): WebSocketData {
        const ret = new WebSocketData(
            map.type,
            map.id === undefined ? undefined : BigInt(map.id),
            map.path,
        )
        ret.header = map.header
        ret.status = map.status
        ret.data = map.data
        return ret
    }
}

class FetchPromise {
    resolve: (value: WebSocketData | PromiseLike<WebSocketData>) => void
    reject: (reason?: any) => void

    constructor(resolve: (value: (PromiseLike<WebSocketData> | WebSocketData)) => void, reject: (reason?: any) => void) {
        this.resolve = resolve;
        this.reject = reject;
    }
}

export interface WebSocketClientOption {
    readTimeout?: number
    heartbeat?: number
    decode?: Decoder
    encode?: Encoder
}

export class WebSocketClient {
    protected baseUrl: string;
    protected socket?: WebSocket;
    protected requestId: bigint = 0n
    protected requestMap: Map<bigint, FetchPromise> = new Map<bigint, FetchPromise>()
    protected server?: Server
    protected readTimeout: number = 30000;
    protected heartbeat: number = 30000;
    protected interval: NodeJS.Timeout | null = null;
    protected headTimeout: boolean = false;
    protected decode: Decoder
    protected encode: Encoder
    public onclose?: ((code: string) => any) | null;

    constructor(baseUrl: string, server?: Server, option?: WebSocketClientOption) {
        this.baseUrl = baseUrl;
        this.server = server;
        this.readTimeout = option?.readTimeout ?? 30000;
        this.heartbeat = option?.heartbeat ?? 30000;
        this.decode = option?.decode ?? NewJsonDecoder()
        this.encode = option?.encode ?? NewJsonEncode()
    }

    public async request(path: string, notification: boolean, req: RequestType, tag: string, from?: FromMap, opt?: Option): Promise<ResponseType> {
        this.requestId++
        let data = new WebSocketData(
            notification ? RpcType.Notification : RpcType.Request,
            this.requestId,
            path,
        )
        if (opt?.headers) {
            data.header = {}
            opt.headers.forEach((value: string, key: string, parent: Headers): void => {
                data.header![key] = (data.header![key] || []).concat(value);
            });
        }
        if (req instanceof Blob) {
            req = await req.arrayBuffer()
        }
        data.data = req
        const body = this.encode(data, (tag?.length ?? 0) > 0 ? "I" + tag : "")

        const promise = new Promise<WebSocketData>((resolve, reject) => {
            let promise = new FetchPromise((value) => {
                if (this.requestMap.delete(data.id!)) {
                    resolve(value)
                }
            }, (e) => {
                if (this.requestMap.delete(data.id!)) {
                    reject(e)
                }
            })
            if (!notification) {
                setTimeout(() => {
                    reject("timeout")
                }, this.readTimeout)
                this.requestMap.set(data.id!, promise)
            }
        })
        this.socket?.send(body)
        if (notification) {
            return
        }
        data = await promise
        if (from) {
            return from(data.data as Record<string, any>, tag)
        }
        return data.data
    }


    public connect(protocols?: string | string[]): Promise<void> {
        let url = this.baseUrl
        return new Promise((resolve: (value: void | PromiseLike<void>) => void, r: (reason?: any) => void) => {
            let reject: ((reason?: any) => void) | null = r
            clearInterval(this.interval ?? 0)
            try {
                this.socket = new WebSocket(url, protocols)
                this.socket.onclose = (event) => {
                    clearInterval(this.interval ?? 0)
                    this.onclose?.call(this, event.reason)
                }
                this.socket.onerror = (event) => {
                    reject?.call(this, event)
                    reject = null
                }
                this.socket.onmessage = async (event) => {
                    try {
                        let data: ArrayBuffer = event.data instanceof Blob ? await (event.data as Blob).arrayBuffer() : event.data
                        await this.onMessage(data)
                    } catch (e) {
                        if (e != "Method not found"){
                            console.log(e)
                        }
                    }
                }
                this.socket.onopen = (event) => {
                    this.interval = setInterval(() => this.onHeartbeat(), this.heartbeat)
                    resolve()
                }
            } catch (e) {
                reject?.call(this, e)
                reject = null
            }
        })
    }

    public close() {
        clearInterval(this.interval ?? 0)
        this.socket?.close()
    }

    private async onMessage(buffer: ArrayBuffer) {
        this.headTimeout = false
        const response = this.decode(buffer, WebSocketData.fromMap, "") as WebSocketData

        if (response.type == RpcType.Response) {
            if (response.status == 200) {
                this.requestMap.get(response.id!)?.resolve(response)
            } else {
                this.requestMap.get(response.id!)?.reject(`Error: ${response.status}`)
            }
        } else if (response.type == RpcType.Ping) {
            const data = new WebSocketData(RpcType.Pong)
            this.socket?.send(this.encode(data, ""))
        } else if (response.type == RpcType.Request || response.type == RpcType.Notification) {
            await this.onRequest(response, response.type == RpcType.Notification)
        }
    }

    private async onRequest(request: WebSocketData, broadcast: boolean) {
        if (broadcast) {
            this.server?.response(request.path!, request.data as ArrayBuffer)
            return
        }
        let data = new WebSocketData(
            RpcType.Response,
            request.id,
            request.path,
        )
        if (this.server) {
            let resp = await this.server?.response(request.path!, request.data as ArrayBuffer)
            if (resp instanceof Blob) {
                resp = await resp.arrayBuffer()
            }
            data.data = resp
        } else {
            data.status = 404
        }
        this.socket?.send(this.encode(data, (request.path?.length ?? 0) > 0 ? "I" + request.path : ""))
    }

    private onHeartbeat() {
        if (this.socket?.OPEN) {
            if (this.headTimeout) {
                this.socket.close()
                clearInterval(this.interval ?? 0)
                this.onclose?.call(this, "timeout")
                return
            }
            const data = new WebSocketData(RpcType.Ping)
            this.socket.send(this.encode(data, ""))
            this.headTimeout = true
        }
    }
}
