//等待指定时间 （毫秒）
export async function waiting(time: number): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), Math.max(time, 0))
    })
}

export function convertArray<T, E>(list: T[] | null, call: (item: T) => E): E[] | null {
    if (null == list) {
        return null
    }
    let ret: E[] = new Array(list.length)
    for (const key in list) {
        ret[key] = call(list[key])
    }

    return ret
}

export class RecordEntry<T extends keyof any, E> {
    get val(): E {
        return this._val;
    }

    get key(): T {
        return this._key;
    }

    private _key: T
    private _val: E

    constructor(key: T, val: E) {
        this._key = key
        this._val = val
    }
}

export function convertRecord<T extends keyof any, E, A extends keyof any, B, >(record: Record<T, E> | null, call: (key: T, val: E) => RecordEntry<A, B>): Record<A, B> | null {
    if (null == record) {
        return null
    }
    let ret: Record<A, B> = {} as Record<A, B>
    for (const key in record) {
        let val = call(key, record [key])
        ret[val.key] = val.val
    }
    return ret
}

export function isRecord(o: any) {
    return Object.getPrototypeOf({}) === Object.getPrototypeOf(o)
}

export function isArray(o: any) {
    return Object.getPrototypeOf([]) === Object.getPrototypeOf(o)
}

export function formatDate(date: Date | string | number, format?: string): string {
    if (!format) format = "YYYY-MM-DD"
    switch (typeof date) {
        case "string":
            date = new Date(date.replace(/-/g, "/"));
            break;
        case "number":
            date = new Date(date);
            break;
    }
    if (date instanceof Date) {
        const dict: any = {
            YYYY: date.getFullYear(),
            M: date.getMonth() + 1,
            D: date.getDate(),
            H: date.getHours(),
            m: date.getMinutes(),
            s: date.getSeconds(),
            S: date.getMilliseconds(),
            MM: ("" + (date.getMonth() + 101)).substring(1),
            DD: ("" + (date.getDate() + 100)).substring(1),
            HH: ("" + (date.getHours() + 100)).substring(1),
            mm: ("" + (date.getMinutes() + 100)).substring(1),
            ss: ("" + (date.getSeconds() + 100)).substring(1),
            SS: ("" + (date.getMilliseconds() + 100)).substring(1)
        };
        return format.replace(/(YYYY|MM?|DD?|HH?|ss?|mm?|SS?)/g, function () {
            return dict[arguments[0]];
        });
    }
    return "" + date
}

export function isData(obj: any): boolean {
    return obj && typeof obj.toMap === 'function';
}

const BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function traceId(): string {
    const buf = new Uint8Array(16);
    const view = new DataView(buf.buffer);

    // 1. 前 8 字节：写入毫秒时间戳
    const milli = BigInt(Date.now());
    view.setBigUint64(0, milli, false);

    // 2. 后 8 字节：使用完美兼容浏览器的全局 Web Crypto API
    const randBuf = new Uint8Array(8);
    // 浏览器和前端框架（如 Vite）原生支持全局的 crypto 对象
    window.crypto.getRandomValues(randBuf);
    buf.set(randBuf, 8);

    // 3. 将 16 字节整体转为 128 位 BigInt
    let num = 0n;
    for (let i = 0; i < 16; i++) {
        num = (num << 8n) | BigInt(buf[i]);
    }

    // 4. Base62 编码
    const result = new Array<string>(22);
    const target = 62n;
    for (let i = 21; i >= 0; i--) {
        const rem = num % target;
        num = num / target;
        result[i] = BASE62_CHARS[Number(rem)];
    }

    return result.join('');
}