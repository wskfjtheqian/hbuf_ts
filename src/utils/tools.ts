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
    if (!format) format = "yyyy-MM-dd"
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
            yyyy: date.getFullYear(),
            M: date.getMonth() + 1,
            d: date.getDate(),
            H: date.getHours(),
            m: date.getMinutes(),
            s: date.getSeconds(),
            MM: ("" + (date.getMonth() + 101)).substr(1),
            dd: ("" + (date.getDate() + 100)).substr(1),
            HH: ("" + (date.getHours() + 100)).substr(1),
            mm: ("" + (date.getMinutes() + 100)).substr(1),
            ss: ("" + (date.getSeconds() + 100)).substr(1)
        };
        return format.replace(/(yyyy|MM?|dd?|HH?|ss?|mm?)/g, function () {
            return dict[arguments[0]];
        });
    }
    return "" + date
}
