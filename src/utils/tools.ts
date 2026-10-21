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

// 预定义 Base62 的字符集（共 62 个字符，与 Go 完全一致）
const BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function traceId(): string {
    // 1. 获取当前毫秒时间戳（约占 41~42 位）
    const milli = BigInt(Date.now());

    // 2. ⚡ 完美适配浏览器：使用 Web Crypto API 生成 9 字节安全随机数
    const randBuf = new Uint8Array(9);
    // window.crypto 在现代浏览器、Edge 边缘计算及 Web Workers 中原生支持
    window.crypto.getRandomValues(randBuf);

    // 3. 将 9 字节随机数通过位移切出 65 位
    let random65 = 0n;
    for (let i = 0; i < 9; i++) {
        random65 = (random65 << 8n) | BigInt(randBuf[i]);
    }
    // 约束最高位在 65 位以内（严格对齐 Go 端的最高位边界）
    random65 = random65 & ((1n << 65n) - 1n);

    // 4. 严格对齐 Go 端的紧凑大数拼装逻辑：将时间戳左移 65 位，然后或上随机数
    // 高位被完全填满，彻底消灭开头的 0
    let num = (milli << 65n) | random65;

    // 5. 执行 Base62 编码，目标空间固定为 18 位
    const result = new Array<string>(18);
    const target = 62n;

    for (let i = 17; i >= 0; i--) {
        const rem = num % target;
        num = num / target;
        result[i] = BASE62_CHARS[Number(rem)];
    }

    return result.join('');
}