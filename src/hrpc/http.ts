import {BufferType, Decoder, Encoder, NewJsonDecoder, NewJsonEncode, Option, RequestType, ResponseType} from "./rpc";
import {Data, FromMap} from "../hbuf/data";
import {isData, traceId} from "../utils/tools";


export interface HttpClientOption {
    decode?: Decoder
    encode?: Encoder
}

export class HttpClient {
    protected base: string;
    protected decode: Decoder
    protected encode: Encoder


    public constructor(base: string, option?: HttpClientOption) {
        this.base = base.replace(/^\/+|\/+$/g, "") + "/"
        this.decode = option?.decode ?? NewJsonDecoder()
        this.encode = option?.encode ?? NewJsonEncode()

    }

    public async request(path: string, notification: boolean, req: RequestType, tag: string, from?: FromMap, opt?: Option): Promise<ResponseType> {
        const body = isData(req) ? this.encode(req as Data, (tag?.length ?? 0) > 0 ? "I" + tag : "") : req as BufferType
        const resp = await this.fetch(path, body, opt)
        if (from) {
            return this.decode(((resp instanceof Blob) ? await resp.arrayBuffer() : resp), from, tag)
        } else {
            return resp
        }
    }

    protected async fetch(path: string, body?: BufferType, opt?: Option): Promise<BufferType> {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", this.base + path)
        xhr.setRequestHeader("Content-Type", "application/octet-stream")
        xhr.setRequestHeader("X-Trace-Id", opt?.traceId ?? traceId())
        xhr.send(body)
        return new Promise<BufferType>((resolve, reject) => {
            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(xhr.response)
                } else {
                    reject(new Error(`HTTP Error: ${xhr.status} ${xhr.statusText}`))
                }
            }
            xhr.onerror = () => {
                reject(new Error("Network Error"))
            }
        })
    }
}

export class FetchClient {
    protected base: string;
    protected decode: Decoder
    protected encode: Encoder


    public constructor(base: string, option?: HttpClientOption) {
        this.base = base.replace(/^\/+|\/+$/g, "") + "/"
        this.decode = option?.decode ?? NewJsonDecoder()
        this.encode = option?.encode ?? NewJsonEncode()

    }

    public async request(path: string, notification: boolean, req: RequestType, tag: string, from?: FromMap, opt?: Option): Promise<ResponseType> {
        const body = isData(req) ? this.encode(req as Data, (tag?.length ?? 0) > 0 ? "I" + tag : "") : req as BufferType
        const resp = await this.fetch(path, body, opt)
        if (from) {
            return this.decode(((resp instanceof Blob) ? await resp.arrayBuffer() : resp), from, tag)
        } else {
            return resp
        }
    }

    protected async fetch(path: string, body?: BufferType, opt?: Option): Promise<BufferType> {
        const headers = opt?.headers ?? new Headers()
        headers.append("X-Trace-Id", opt?.traceId ?? traceId())
        const res = await fetch(this.base + path, {
            method: "POST",
            body: body,
            headers: headers
        })
        if (res.ok) {
            return res.arrayBuffer()
        } else {
            throw new Error(`HTTP Error: ${res.status} ${res.statusText}`)
        }
    }
}
