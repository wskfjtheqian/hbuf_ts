import {BufferType, Option, Request, RequestMiddleware} from "./rpc";

export interface HttpClientOption {
    middleware?: RequestMiddleware[];
}

export class HttpClient {
    protected base: string;
    protected middleware: RequestMiddleware;

    public constructor(base: string, option?: HttpClientOption) {
        this.base = base.replace(/^\/+|\/+$/g, "") + "/"
        this.middleware = (next: Request): Request => {
            for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
                next = option!.middleware![i](next)
            }
            return next
        }
    }

    public request(path: string, notification: boolean, callback: () => BufferType, opt?: Option): Promise<ArrayBuffer> {
        return this.middleware((path: string, notification: boolean, callback: () => BufferType): Promise<ArrayBuffer> => {
            return this.fetch(this.base + path, {
                method: "POST",
                body: callback(),
                headers: opt?.headers,
            })
            

        })(path, notification, callback)
    }

    protected async fetch(path: string, init: RequestInit): Promise<ArrayBuffer> {
        const res = await fetch(this.base + path, init)
        if (res.ok) {
            return res.arrayBuffer()
        } else {
            throw new Error(`HTTP Error: ${res.status} ${res.statusText}`)
        }
    }
}
