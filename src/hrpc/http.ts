import {BufferType, Context, Request, RequestMiddleware} from "./rpc";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface HttpClientOption {
    middleware?: RequestMiddleware[];
}

export class HttpClient {
    base: string;
    middleware: RequestMiddleware;

    constructor(base: string, option?: HttpClientOption) {
        this.base = base.replace(/^\/+|\/+$/g, "") + "/"
        this.middleware = (next: Request): Request => {
            for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
                next = option!.middleware![i](next)
            }
            return next
        }
    }

    request(path: string, notification: boolean, callback: () => BufferType, ctx?: Context): Promise<ArrayBuffer> {
        return this.middleware(async (path: string, notification: boolean, callback: () => BufferType): Promise<ArrayBuffer> => {
            const res = await fetch(this.base + path, {
                method: "POST",
                body: callback(),
                headers: ctx?.headers,
            })
            if (res.ok) {
                return res.arrayBuffer()
            } else {
                throw new Error(`HTTP Error: ${res.status} ${res.statusText}`)
            }
        })(path, notification, callback)
    }

}
