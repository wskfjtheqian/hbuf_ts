import { NewJsonDecoder, NewJsonEncode } from "./rpc";
import { Data } from "../hbuf/data";
export class HttpClient {
    constructor(base, option) {
        this.base = base.replace(/^\/+|\/+$/g, "") + "/";
        this.decode = option?.decode ?? NewJsonDecoder();
        this.encode = option?.encode ?? NewJsonEncode();
    }
    async request(path, notification, req, tag, from, opt) {
        const body = req instanceof Data ? this.encode(req, (tag?.length ?? 0) > 0 ? "I" + tag : "") : req;
        const resp = await this.fetch(path, body, opt);
        if (from) {
            return this.decode(((resp instanceof Blob) ? await resp.arrayBuffer() : resp), from, tag);
        }
        else {
            return resp;
        }
    }
    async fetch(path, body, opt) {
        const res = await fetch(this.base + path, {
            method: "POST",
            body: body,
            headers: opt?.headers
        });
        if (res.ok) {
            return res.arrayBuffer();
        }
        else {
            throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
        }
    }
}
