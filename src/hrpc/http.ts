import {BufferType, Decoder, Encoder, NewJsonDecoder, NewJsonEncode, Option, RequestType, ResponseType} from "./rpc";
import {Data, FromMap} from "../hbuf/data";


export interface HttpClientOption {
    decode?: Decoder
    encode?: Encoder
}

class HttpClient {
    protected base: string;
    protected decode: Decoder
    protected encode: Encoder


    public constructor(base: string, option?: HttpClientOption) {
        this.base = base.replace(/^\/+|\/+$/g, "") + "/"
        this.decode = option?.decode ?? NewJsonDecoder()
        this.encode = option?.encode ?? NewJsonEncode()

    }

    public async request(path: string, notification: boolean, req: RequestType, tag: string, from?: FromMap, opt?: Option): Promise<ResponseType> {
        const body = req instanceof Data ? this.encode(req, (tag?.length ?? 0) > 0 ? "I" + tag : "") : req
        const resp = await this.fetch(path, body, opt)
        if (from) {
            return this.decode(((resp instanceof Blob) ? await resp.arrayBuffer() : resp), from, tag)
        } else {
            return resp
        }
    }

    protected async fetch(path: string, body?: BufferType, opt?: Option): Promise<BufferType> {
        const res = await fetch(this.base + path, {
            method: "POST",
            body: body,
            headers: opt?.headers
        })
        if (res.ok) {
            return res.arrayBuffer()
        } else {
            throw new Error(`HTTP Error: ${res.status} ${res.statusText}`)
        }
    }
}

export default HttpClient
