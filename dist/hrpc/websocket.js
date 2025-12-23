import { NewJsonDecoder, NewJsonEncode } from "./rpc";
export var RpcType;
(function (RpcType) {
    RpcType[RpcType["Request"] = 0] = "Request";
    RpcType[RpcType["Response"] = 1] = "Response";
    RpcType[RpcType["Notification"] = 2] = "Notification";
    RpcType[RpcType["AuthSuccess"] = 3] = "AuthSuccess";
    RpcType[RpcType["AuthFailure"] = 4] = "AuthFailure";
    RpcType[RpcType["Ping"] = 5] = "Ping";
    RpcType[RpcType["Pong"] = 6] = "Pong";
})(RpcType || (RpcType = {}));
export class WebSocketData {
    constructor(type, id, path, data) {
        this.header = {};
        this.status = 0;
        this.type = type;
        this.id = id;
        this.path = path;
    }
    toMap(tag) {
        return {
            type: this.type,
            header: this.header,
            id: this.id,
            path: this.path,
            status: this.status,
        };
    }
    static fromMap(map, tag) {
        const ret = new WebSocketData(map.type, map.id, map.path);
        ret.header = map.header;
        ret.status = map.status;
        ret.data = map.data;
        return ret;
    }
}
class FetchPromise {
    constructor(resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;
    }
}
export class WebSocketClient {
    constructor(baseUrl, server, option) {
        this.requestId = 0;
        this.requestMap = new Map();
        this.readTimeout = 30000;
        this.heartbeat = 30000;
        this.interval = null;
        this.headTimeout = false;
        this.baseUrl = baseUrl;
        this.server = server;
        this.readTimeout = option?.readTimeout ?? 30000;
        this.heartbeat = option?.heartbeat ?? 30000;
        this.decode = option?.decode ?? NewJsonDecoder();
        this.encode = option?.encode ?? NewJsonEncode();
    }
    async request(path, notification, req, tag, from, opt) {
        this.requestId++;
        let header = new Map();
        let data = new WebSocketData(notification ? RpcType.Notification : RpcType.Request, this.requestId, path);
        if (req instanceof Blob) {
            req = await req.arrayBuffer();
        }
        data.data = req;
        const body = this.encode(data, (tag?.length ?? 0) > 0 ? "I" + tag : "");
        data = await new Promise((resolve, reject) => {
            let promise = new FetchPromise((value) => {
                if (this.requestMap.delete(data.id)) {
                    resolve(value);
                }
            }, (e) => {
                if (this.requestMap.delete(data.id)) {
                    reject(e);
                }
            });
            setTimeout(() => {
                reject("timeout");
            }, this.readTimeout);
            this.requestMap.set(data.id, promise);
        });
        try {
            this.socket?.send(body);
        }
        catch (e) {
            this.socket?.send(body);
        }
        if (from) {
            return from(data.data, tag);
        }
        return data.data;
    }
    connect(params) {
        let url = this.baseUrl;
        let temp = "";
        if (params) {
            for (const key in params) {
                for (const index in params[key]) {
                    temp += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(params[key][index]);
                }
            }
        }
        return new Promise((resolve, r) => {
            let reject = r;
            clearInterval(this.interval ?? 0);
            try {
                this.socket = new WebSocket(url, [encodeURIComponent(temp)]);
                this.socket.onclose = (event) => {
                    clearInterval(this.interval ?? 0);
                    this.onclose?.call(this, event.reason);
                };
                this.socket.onerror = (event) => {
                    reject?.call(this, event);
                    reject = null;
                };
                this.socket.onmessage = async (event) => {
                    try {
                        let data = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
                        await this.onMessage(data);
                    }
                    catch (e) {
                        console.log(e);
                    }
                };
                // this.socket.onopen = (event) => {
                //     this.interval = setInterval(() => this.onHeartbeat(), this.heartbeat)
                // }
            }
            catch (e) {
                reject?.call(this, e);
                reject = null;
            }
        });
    }
    close() {
        clearInterval(this.interval ?? 0);
        this.socket?.close();
    }
    async onMessage(buffer) {
        this.headTimeout = false;
        const response = this.decode(buffer, WebSocketData.fromMap, "");
        if (response.type == RpcType.Response) {
            if (response.status == 200) {
                this.requestMap.get(response.id)?.resolve(response);
            }
            else {
                this.requestMap.get(response.id)?.reject(response);
            }
        }
        else if (response.type == RpcType.Request || response.type == RpcType.Notification) {
            await this.onRequest(response, response.type == RpcType.Notification);
        }
    }
    async onRequest(request, broadcast) {
        if (broadcast) {
            this.server?.response(request.path, request.data);
            return;
        }
        let data = new WebSocketData(RpcType.Response, request.id, request.path);
        if (this.server) {
            let resp = await this.server?.response(request.path, request.data);
            if (resp instanceof Blob) {
                resp = await resp.arrayBuffer();
            }
            data.data = resp;
        }
        else {
            data.status = 404;
        }
        this.socket?.send(this.encode(data, (request.path.length ?? 0) > 0 ? "I" + request.path : ""));
    }
}
