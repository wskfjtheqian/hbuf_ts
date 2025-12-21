import {Result, Server} from "./rpc";
import {Data} from "../hbuf/data";


export enum RpcType {
    Request = 0,
    Response = 1,
    Notification = 2,
    AuthSuccess = 3,
    AuthFailure = 4,
}
export class WebSocketData {
    constructor(type: RpcType, id: number, path: string, status: number) {
        this.type = type;
        this.id = id;
        this.path = path;
        this.status = status;
    }

    type: RpcType
    header: Record<string, string[]> = {}
    data?: Data | null
    id: number
    path: string
    status: number

    toMap(tag: string): Record<string, any> {
        return {
            type: this.type,
            header: this.header,
            data: this.data?.toMap(tag),
            id: this.id,
            path: this.path,
            status: this.status,
        }
    }
}

class PromiseCall {
    resolve: (value: WebSocketData | PromiseLike<WebSocketData>) => void
    reject: (reason?: any) => void

    constructor(resolve: (value: (PromiseLike<WebSocketData> | WebSocketData)) => void, reject: (reason?: any) => void) {
        this.resolve = resolve;
        this.reject = reject;
    }
}


export interface WebSocketClientOption {
    readTimeout: number
    heartbeat: number
}

export class WebSocketClient {
    protected baseUrl: string;
    protected socket?: WebSocket;
    protected requestId: number = 0
    protected requestMap: Map<number, PromiseCall> = new Map<number, PromiseCall>()
    protected decoder: TextDecoder = new TextDecoder()
    protected encoder: TextEncoder = new TextEncoder()
    protected server?: Server
    protected readTimeout: number = 30000;
    protected heartbeat: number = 30000;
    protected interval: number | null = null;
    protected headTimeout: boolean = false;

    public onclose?: ((code: string) => any) | null;


    constructor(baseUrl: string, server?: Server, option?: WebSocketClientOption) {
        this.baseUrl = baseUrl;
        this.server = server;
        this.readTimeout = option?.readTimeout ?? 30000;
        this.heartbeat = option?.heartbeat ?? 30000;

        this.interceptor = new SocketInterceptor((data, next) => this.socketInvoke(data, next));
    }


    private socketInvoke(data: WebSocketData, next?: SocketInterceptor): Promise<WebSocketData | void> {
        var ret: Promise<any> = Promise.resolve()
        if (data.type == RpcType.Request) {
            ret = new Promise<WebSocketData>((resolve, reject) => {
                let promise = new PromiseCall((value) => {
                    if (this.requestMap.delete(data.id)) {
                        resolve(value)
                    }
                }, (e) => {
                    if (this.requestMap.delete(data.id)) {
                        reject(e)
                    }
                })
                setTimeout(() => {
                    reject("timeout")
                }, this.readTimeout)
                this.requestMap.set(data.id, promise)
            }).then((value: WebSocketData) => {
                if (next != null) {
                    return next.invoke(value, next.next)
                } else {
                    return value
                }
            });
        }
        this.socket?.send(this.encoder.encode(JSON.stringify(data.toJson())).buffer)
        return ret
    }


    invoke<T>(serverName: string, serverId: number, name: string, id: number, req: Data, fromJson: ((json: {}) => T) | null, fromData: ((json: BinaryData) => T) | null): Promise<T> {
        this.requestId++
        let header = new Map();
        let data = new WebSocketData(
            fromJson ? RpcType.Request : RpcType.Notification,
            this.requestId,
            "/" + serverName + "/" + name,
            0,
        )
        data.data = req
        return this.interceptor.invoke(data, this.interceptor.next).then((value): T => {
            if (fromJson) {
                let result = (value as WebSocketData).data as Result
                if (0 == result.code) {
                    return fromJson(result.data || {})
                }
                throw result
            }
            return null as T
        })
    }

    public connect(params?: Record<string, string[]>): Promise<void> {
        let url = this.baseUrl
        let temp = ""
        if (params) {
            for (const key in params) {
                for (const index in params[key]) {
                    temp += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(params[key][index])
                }
            }
        }
        return new Promise((resolve, r) => {
            let reject: ((reason?: any) => void) | null = r
            clearInterval(this.interval ?? 0)
            try {
                this.socket = new WebSocket(url, [encodeURIComponent(temp)])
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
                        let value: ArrayBuffer = event.data instanceof Blob ? await (event.data as Blob).arrayBuffer() : event.data
                        let response = JSON.parse(this.decoder.decode(new Uint8Array(value))) as RpcData
                        if (response.type === RpcType.AuthSuccess) {
                            resolve()
                        } else if (response.type === RpcType.AuthFailure) {
                            reject?.call(this, "auth failure")
                            reject = null
                        } else {
                            await this.onMessage(response)
                        }
                    } catch (e) {
                        console.log(e)
                    }
                }
                this.socket.onopen = (event) => {
                    this.interval = setInterval(() => this.onHeartbeat(), this.heartbeat)
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

    private async onMessage(response: WebSocketData) {
        this.headTimeout = false

        if (response.type == RpcType.Request || response.type == RpcType.Notification) {
            await this.onRequest(response, response.type == RpcType.Notification)
        } else if (response.type == RpcType.Response) {
            if (response.status == 200) {
                this.requestMap.get(response.id)?.resolve(response)
            } else {
                this.requestMap.get(response.id)?.reject(response)
            }
        }
    }

    private async onRequest(request: WebSocketData, broadcast: boolean) {
        if (broadcast) {
            this.server?.invoke(request)
            return
        }
        let data: WebSocketData
        if (this.server) {
            data = await this.server.invoke(request)
        } else {
            data = new WebSocketData(
                RpcType.Response,
                request.id,
                "",
                404,
            )
        }
        this.socket?.send(this.encoder.encode(JSON.stringify(data.toMap())).buffer)
    }

    private onHeartbeat() {
        if (this.socket?.OPEN) {
            if (this.headTimeout) {
                this.socket.close()
                clearInterval(this.interval ?? 0)
                this.onclose?.call(this, "timeout")
                return
            }
            this.socket.send(this.encoder.encode(JSON.stringify({
                type: RpcType.Notification
            })))
            this.headTimeout = true
        }
    }
}
