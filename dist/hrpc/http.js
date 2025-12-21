export class HttpClient {
    constructor(base, option) {
        this.base = base.replace(/^\/+|\/+$/g, "") + "/";
        this.middleware = (next) => {
            for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
                next = option.middleware[i](next);
            }
            return next;
        };
    }
    request(path, notification, callback, ctx) {
        return this.middleware(async (path, notification, callback) => {
            const res = await fetch(this.base + path, {
                method: "POST",
                body: callback(),
                headers: ctx?.headers,
            });
            if (res.ok) {
                return res.arrayBuffer();
            }
            else {
                throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
            }
        })(path, notification, callback);
    }
}
