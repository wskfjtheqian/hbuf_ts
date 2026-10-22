import {HData, isHData} from "../hbuf/data";
import {DataDescriptor, Descriptor, FieldDesc, Int32Descriptor, Int64Descriptor, ListDescriptor, MapDescriptor, RefDescriptor, StringDescriptor, Uint8Descriptor} from "../hbuf/descriptor";
import {Decoder, Encoder, JsonDescriptor, NewJsonDecoder, NewJsonEncode, NewResultDesc, Option, RequestType, ResponseType, Result, Server} from "./rpc";


export enum RpcType {
    Request = 0,
    Response = 1,
    Notification = 2,
    Ping = 3,
    Pong = 4,
}

/**
 * WebSocketData WebSocket 信封：type/header/id/path/status + 异构 data 负载。
 * data 为 HData 时按其描述符编解码，否则走 JSON 透传（JsonDescriptor）。
 */
export class WebSocketData implements HData {
    type: RpcType
    header?: Map<string, string[]>
    data?: ArrayBuffer | HData | void
    id?: bigint
    path?: string
    status?: number

    constructor(type: RpcType, id?: bigint, path?: string, data?: ArrayBuffer | HData) {
        this.type = type;
        this.id = id;
        this.path = path;
        this.data = data;
    }

    descriptors(): Descriptor {
        const dataDesc = isHData(this.data) ? this.data.descriptors() : jsonDesc
        return webSocketDataDesc(dataDesc)
    }
}

// jsonDesc JSON 透传描述符（信封 data 的缺省编解码）。
const jsonDesc: JsonDescriptor = new JsonDescriptor(true)

function webSocketDataDesc(dataDesc: Descriptor): DataDescriptor {
    return new DataDescriptor(
        () => new WebSocketData(RpcType.Request),
        new Map<number, FieldDesc>([
            [1, {name: "type", desc: new Uint8Descriptor(), get: (o: WebSocketData) => o.type, set: (o: WebSocketData, v: number) => o.type = v}],
            [2, {name: "header", desc: new MapDescriptor(new StringDescriptor(), new ListDescriptor(new StringDescriptor()), true), get: (o: WebSocketData) => o.header, set: (o: WebSocketData, v: any) => o.header = v}],
            [3, {name: "id", desc: new Int64Descriptor(true), get: (o: WebSocketData) => o.id, set: (o: WebSocketData, v: any) => o.id = v}],
            [4, {name: "path", desc: new StringDescriptor(true), get: (o: WebSocketData) => o.path, set: (o: WebSocketData, v: any) => o.path = v}],
            [5, {name: "status", desc: new Int32Descriptor(true), get: (o: WebSocketData) => o.status, set: (o: WebSocketData, v: any) => o.status = v}],
            [6, {name: "data", desc: new RefDescriptor(dataDesc, true), get: (o: WebSocketData) => o.data, set: (o: WebSocketData, v: any) => o.data = v}],
        ]),
    )
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

    public async request(path: string, notification: boolean, req: RequestType, desc?: DataDescriptor, opt?: Option): Promise<ResponseType> {
        this.requestId++
        let data = new WebSocketData(
            notification ? RpcType.Notification : RpcType.Request,
            this.requestId,
            path,
        )
        if (opt?.headers) {
            const header = new Map<string, string[]>()
            opt.headers.forEach((value: string, key: string): void => {
                header.set(key, (header.get(key) || []).concat(value));
            });
            data.header = header
        }
        if (req instanceof Blob) {
            req = await req.arrayBuffer()
        }
        data.data = req
        const body = this.encode(data)

        const promise = new Promise<WebSocketData>((resolve, reject) => {
            let timer: NodeJS.Timeout | undefined
            const p = new FetchPromise((value) => {
                if (this.requestMap.delete(data.id!)) {
                    clearTimeout(timer)
                    resolve(value)
                }
            }, (e) => {
                if (this.requestMap.delete(data.id!)) {
                    clearTimeout(timer)
                    reject(e)
                }
            })
            if (!notification) {
                timer = setTimeout(() => {
                    if (this.requestMap.delete(data.id!)) {
                        reject("timeout")
                    }
                }, this.readTimeout)
                this.requestMap.set(data.id!, p)
            }
        })
        this.socket?.send(body)
        if (notification) {
            return
        }
        data = await promise
        if (desc) {
            // 响应信封 data 为 Result JSON（code/msg/data），按结果描述符解包
            return NewResultDesc(desc).fromJson(data.data as Record<string, any>)
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
                        let buffer: ArrayBuffer = event.data instanceof Blob ? await (event.data as Blob).arrayBuffer() : event.data
                        await this.onMessage(buffer)
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
        const response = this.decode(buffer, webSocketDataDesc(jsonDesc)) as WebSocketData

        if (response.type == RpcType.Response) {
            if (response.status == 200) {
                this.requestMap.get(response.id!)?.resolve(response)
            } else {
                this.requestMap.get(response.id!)?.reject(`Error: ${response.status}`)
            }
        } else if (response.type == RpcType.Ping) {
            const data = new WebSocketData(RpcType.Pong)
            this.socket?.send(this.encode(data))
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
            data.status = 200
            // 与 HTTP 传输一致：响应包装为 Result（code/msg/data）
            data.data = resp instanceof ArrayBuffer ? resp : new Result(0, "ok", resp as HData)
        } else {
            data.status = 404
        }
        this.socket?.send(this.encode(data))
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
            this.socket.send(this.encode(data))
            this.headTimeout = true
        }
    }
}
