import Decimal from "decimal.js";

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

export function convertMap<K, V>(map: Map<any, any> | null, key: (k: any) => K, val: (v: any) => V): Map<K, V> | null {
    if (null == map) {
        return null
    }
    let ret: Map<K, V> = new Map<K, V>()
    map.forEach((v, k) => {
        ret.set(key(k), val(v))
    })
    return ret
}

export function isRecord(o: any) {
    return Object.getPrototypeOf({}) === Object.getPrototypeOf(o)
}

export function isArray(o: any) {
    return Object.getPrototypeOf([]) === Object.getPrototypeOf(o)
}

// 纯日期字符串（YYYY-MM-DD / YYYY-M-D）：Safari 无法解析 "-" 分隔格式，需替换为 "/"
const PURE_DATE_REGEX = /^\d{4}-\d{1,2}-\d{1,2}$/

// 将数字补零到指定宽度
function pad(n: number, width: number): string {
    return ("" + n).padStart(width, "0")
}

export function formatDate(date: Date | string | number, format?: string): string {
    if (!format) format = "YYYY-MM-DD"
    switch (typeof date) {
        case "string":
            date = new Date(PURE_DATE_REGEX.test(date) ? date.replace(/-/g, "/") : date)
            break
        case "number":
            date = new Date(date)
            break
    }
    // 非法输入（Invalid Date）返回空字符串，避免输出 "NaN-NaN-NaN"
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return ""
    }
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    const millisecond = date.getMilliseconds()
    const dict: Record<string, string> = {
        YYYY: pad(year, 4),
        M: "" + month,
        MM: pad(month, 2),
        D: "" + day,
        DD: pad(day, 2),
        H: "" + hour,
        HH: pad(hour, 2),
        m: "" + minute,
        mm: pad(minute, 2),
        s: "" + second,
        ss: pad(second, 2),
        S: "" + millisecond,
        SS: pad(Math.floor(millisecond / 10), 2),
        SSS: pad(millisecond, 3),
    }
    return format.replace(/YYYY|MM?|DD?|HH?|mm?|ss?|SSS?|S/g, (token) => dict[token])
}

//时长秒转成时间格式（超过一天显示为 XdHH:MM:SS）
export function formatDuration(val?: number | Decimal | null | undefined): string {
    const duration = val instanceof Decimal ? val.toNumber() : val
    if (null == duration || !Number.isFinite(duration)) {
        return "00:00:00"
    }
    // 向下取整到整秒，避免小数秒被四舍五入为 "60"；负值按 0 处理
    const total = Math.max(0, Math.floor(duration))
    const days = Math.floor(total / 86400)
    const hours = Math.floor((total % 86400) / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    const hms = `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}`
    return days > 0 ? `${days}d${hms}` : hms
}


export function isData(obj: any): boolean {
    return obj && typeof obj.descriptors === 'function';
}

// 预定义 Base62 的字符集（共 62 个字符，与 Go 完全一致）
const BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function traceId(): string {
    // 1. 获取当前毫秒时间戳（约占 41~42 位）
    const milli = BigInt(Date.now());

    // 2. ⚡ 使用全局 Web Crypto API 生成 9 字节安全随机数
    const randBuf = new Uint8Array(9);
    // 全局 crypto 在现代浏览器、Node 18+、Edge 边缘计算及 Web Workers 中原生支持
    crypto.getRandomValues(randBuf);

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