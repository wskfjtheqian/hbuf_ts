import {HBufError, JsonValue, Reader, Type, Writer} from "./data";
import {DecodeId, DecodeInt64, DecodeType, DecodeUint64, DecodeTime, SkipValue} from "./decoder";
import {EncodeTime, EncodeUint64, LengthId, LengthInt, LengthUint, WriterId, WriterInt64, WriterType} from "./encoder";
import Decimal from "decimal.js";

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder('utf-8')

function utf8Encode(str: string): Uint8Array {
    return utf8Encoder.encode(str)
}

function utf8Decode(b: Uint8Array): string {
    return utf8Decoder.decode(b)
}

const f32View = new Float32Array(1)
const f32Bits = new Uint32Array(f32View.buffer)
const f64View = new Float64Array(1)
const f64Bits = new BigUint64Array(f64View.buffer)

function Float32Bits(v: number): bigint {
    f32View[0] = v
    return BigInt(f32Bits[0])
}

function Float32FromBits(b: bigint): number {
    f32Bits[0] = Number(b & 0xFFFFFFFFn)
    return f32View[0]
}

function Float64Bits(v: number): bigint {
    f64View[0] = v
    return f64Bits[0]
}

function Float64FromBits(b: bigint): number {
    f64Bits[0] = b
    return f64View[0]
}

/** Date 转（秒, 纳秒）。JS Date 为毫秒精度。 */
function DateToTime(v: Date): { secs: bigint, nsec: number } {
    const ms = v.getTime()
    return {
        secs: BigInt(Math.floor(ms / 1000)),
        nsec: (ms % 1000) * 1000000,
    }
}

function TimeToDate(secs: bigint, nsec: number): Date {
    return new Date(Number(secs) * 1000 + Math.floor(nsec / 1000000))
}

/**
 * Descriptor 描述一个 HBuf 值的编解码方式（对应 Go 版 Descriptor，无 unsafe 偏移）。
 */
export interface Descriptor {
    factory(): any

    /** 元素缺失时的零值（List 元素 / Map Key/Value 的空标记场景）。 */
    zero(): any

    /** 判断字段值是否为空（零值 / null），为空时字段不写入。 */
    isEmpty(v: any): boolean

    /**
     * encode 将值写入 buf。id 存在时按「字段」编码（TAG | ID | VALUE），
     * 否则按「元素」编码（TAG | VALUE，空值写 1 字节空标记）。
     */
    encode(buf: Writer, v: any, id?: number): void

    /**
     * decode 按实际编码类型 typ 解码一个值并返回。
     * valRead=false 表示无 VALUE 字节（值保持零值）。
     * target 存在时（Data 类型）就地填充并返回该实例。
     */
    decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any

    toJson(v: any): JsonValue

    fromJson(json: JsonValue, target?: any): any
}

/** 数值基类（int / uint 系） */
abstract class IntBase implements Descriptor {
    protected constructor(protected isPtr = false) {
    }

    public abstract factory(): any

    abstract fromJson(json: JsonValue, target?: any): any

    abstract toJson(v: any): JsonValue

    abstract zero(): any

    protected abstract typ(): Type

    protected abstract length(v: bigint): number

    protected abstract writeValue(buf: Writer, v: bigint): void

    protected abstract toBigInt(v: any): bigint

    protected abstract fromBigInt(v: bigint): any

    /** 元素零值空标记的 idLen（uint8 特例为 2）。 */
    protected emptyIdLen(): number {
        return 0
    }

    protected isEmptyField(v: any): boolean {
        if (v == null) {
            return true
        }
        return !this.isPtr && v === this.zero()
    }

    public isEmpty(v: any): boolean {
        return this.isEmptyField(v)
    }

    public encode(buf: Writer, v: any, id?: number): void {
        if (id !== undefined) {
            if (this.isEmptyField(v)) {
                return
            }
            const val = this.toBigInt(v)
            WriterType(buf, this.typ(), LengthId(id), this.length(val))
            WriterId(buf, id)
            this.writeValue(buf, val)
        } else {
            if (v == null) {
                WriterType(buf, this.typ(), this.isPtr ? 0 : this.emptyIdLen(), 1)
                return
            }
            const val = this.toBigInt(v)
            if (val === 0n) {
                WriterType(buf, this.typ(), this.emptyIdLen(), 1)
                return
            }
            WriterType(buf, this.typ(), 1, this.length(val))
            this.writeValue(buf, val)
        }
    }

    public decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        let val: bigint
        switch (typ) {
            case Type.TBool:
                val = valueLen === 2 ? 1n : 0n
                break
            case Type.TInt:
                val = valRead ? DecodeInt64(r, valueLen) : 0n
                break
            case Type.TUint:
                val = valRead ? DecodeUint64(r, valueLen) : 0n
                break
            case Type.TFloat: {
                if (!valRead) {
                    val = 0n
                    break
                }
                const bits = DecodeUint64(r, valueLen)
                val = BigInt(Math.trunc(valueLen <= 4
                    ? Float32FromBits(bits & 0xFFFFFFFFn)
                    : Float64FromBits(bits)))
                break
            }
            case Type.TBytes: {
                if (!valRead) {
                    val = 0n
                    break
                }
                const size = DecodeUint64(r, valueLen)
                val = BigInt(utf8Decode(r.readBytes(Number(size))))
                break
            }
            default:
                throw new HBufError("invalid int type")
        }
        return this.fromBigInt(val)
    }
}

class SignedInt extends IntBase {
    public factory(): any {
        return 0
    }

    public fromJson(json: JsonValue, target?: any) {
        if (json !== null) {
            if (typeof json === 'number' || typeof json === 'string') {
                return Number(json)
            }
        }
        return this.isPtr ? null : this.factory()
    }

    public toJson(v: any): JsonValue {
        return v
    }

    constructor(isPtr: boolean, private bits: number) {
        super(isPtr)
    }

    public zero(): any {
        return this.isPtr ? null : 0
    }

    protected typ(): Type {
        return Type.TInt
    }

    protected length(v: bigint): number {
        return LengthInt(v)
    }

    protected writeValue(buf: Writer, v: bigint): void {
        WriterInt64(buf, v)
    }

    protected toBigInt(v: any): bigint {
        return BigInt.asIntN(this.bits, BigInt(v))
    }

    protected fromBigInt(v: bigint): any {
        return Number(BigInt.asIntN(this.bits, v))
    }
}

class SignedLong extends IntBase {
    public factory(): any {
        return 0n
    }

    public fromJson(json: JsonValue, target?: any) {
        if (json !== null) {
            if (typeof json === 'number' || typeof json === 'string') {
                return BigInt(json)
            }
        }
        return this.isPtr ? null : this.factory()
    }

    public toJson(v: any): JsonValue {
        return v == null ? null : v.toString()
    }

    constructor(isPtr: boolean) {
        super(isPtr)
    }

    public zero(): any {
        return this.isPtr ? null : 0n
    }

    protected typ(): Type {
        return Type.TInt
    }

    protected length(v: bigint): number {
        return LengthInt(v)
    }

    protected writeValue(buf: Writer, v: bigint): void {
        WriterInt64(buf, v)
    }

    protected toBigInt(v: any): bigint {
        return typeof v === 'bigint' ? v : BigInt(v)
    }

    protected fromBigInt(v: bigint): any {
        return BigInt.asIntN(64, v)
    }
}

class UnsignedInt extends IntBase {
    public factory(): any {
        return 0
    }

    public fromJson(json: JsonValue, target?: any) {
        if (json !== null) {
            if (typeof json === 'number' || typeof json === 'string') {
                return Number(json)
            }
        }
        return this.isPtr ? null : this.factory()
    }

    public toJson(v: any): JsonValue {
        return v
    }

    constructor(isPtr: boolean, private bits: number) {
        super(isPtr)
    }

    public zero(): any {
        return this.isPtr ? null : 0
    }

    protected typ(): Type {
        return Type.TUint
    }

    protected length(v: bigint): number {
        return LengthUint(v)
    }

    protected writeValue(buf: Writer, v: bigint): void {
        EncodeUint64(buf, v)
    }

    protected toBigInt(v: any): bigint {
        return BigInt.asUintN(this.bits, BigInt(v))
    }

    protected fromBigInt(v: bigint): any {
        return Number(BigInt.asUintN(this.bits, v))
    }
}

class UnsignedLong extends IntBase {
    public factory(): any {
        return 0n
    }

    public fromJson(json: JsonValue, target?: any) {
        if (json !== null) {
            if (typeof json === 'number' || typeof json === 'string') {
                return BigInt(json)
            }
        }
        return this.isPtr ? null : this.factory()
    }

    public toJson(v: any): JsonValue {
        return v == null ? null : v.toString()
    }

    constructor(isPtr: boolean) {
        super(isPtr)
    }

    public zero(): any {
        return this.isPtr ? null : 0n
    }

    protected typ(): Type {
        return Type.TUint
    }

    protected length(v: bigint): number {
        return LengthUint(v)
    }

    protected writeValue(buf: Writer, v: bigint): void {
        EncodeUint64(buf, v)
    }

    protected toBigInt(v: any): bigint {
        return typeof v === 'bigint' ? v : BigInt(v)
    }

    protected fromBigInt(v: bigint): any {
        return BigInt.asUintN(64, v)
    }
}

/** Uint8 特例：值 0 恒视为空（无论可空与否）；元素零值空标记 idLen=2。 */
class Uint8Impl extends UnsignedInt {
    constructor(isPtr: boolean) {
        super(isPtr, 8)
    }

    protected emptyIdLen(): number {
        return 2
    }

    protected isEmptyField(v: any): boolean {
        return v == null || v === 0
    }
}

export class Int8Descriptor extends SignedInt {
    constructor(isPtr = false) {
        super(isPtr, 8)
    }
}

export class Int16Descriptor extends SignedInt {
    constructor(isPtr = false) {
        super(isPtr, 16)
    }
}

export class Int32Descriptor extends SignedInt {
    constructor(isPtr = false) {
        super(isPtr, 32)
    }
}

export class Int64Descriptor extends SignedLong {
    constructor(isPtr = false) {
        super(isPtr)
    }
}

export class Uint8Descriptor extends Uint8Impl {
    constructor(isPtr = false) {
        super(isPtr)
    }
}

export class Uint16Descriptor extends UnsignedInt {
    constructor(isPtr = false) {
        super(isPtr, 16)
    }
}

export class Uint32Descriptor extends UnsignedInt {
    constructor(isPtr = false) {
        super(isPtr, 32)
    }
}

export class Uint64Descriptor extends UnsignedLong {
    constructor(isPtr = false) {
        super(isPtr)
    }
}

/** Float / Double 基类 */
abstract class FloatBase implements Descriptor {
    protected constructor(protected isPtr = false, private isDouble: boolean) {
    }

    factory(): any {
        return 0
    }

    public fromJson(json: JsonValue, target?: any) {
        if (json !== null) {
            if (typeof json === 'number' || typeof json === 'string') {
                return Number(json)
            }
        }
        return this.isPtr ? null : this.factory()
    }

    public toJson(v: any): JsonValue {
        return v == null ? null : this.isDouble ? v : Math.fround(v)
    }

    abstract zero(): any

    protected abstract toBits(v: number): bigint

    protected isEmptyField(v: any): boolean {
        if (v == null) {
            return true
        }
        return !this.isPtr && v === 0
    }

    public isEmpty(v: any): boolean {
        return this.isEmptyField(v)
    }

    public encode(buf: Writer, v: any, id?: number): void {
        if (id !== undefined) {
            if (this.isEmptyField(v)) {
                return
            }
            const val = this.toBits(v)
            WriterType(buf, Type.TFloat, LengthId(id), LengthUint(val))
            WriterId(buf, id)
            EncodeUint64(buf, val)
        } else {
            if (v == null) {
                WriterType(buf, Type.TFloat, 0, 1)
                return
            }
            const val = this.toBits(v)
            if (val === 0n) {
                WriterType(buf, Type.TFloat, 0, 1)
                return
            }
            WriterType(buf, Type.TFloat, 1, LengthUint(val))
            EncodeUint64(buf, val)
        }
    }

    public decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        let val: number
        switch (typ) {
            case Type.TBool:
                val = valueLen === 2 ? 1 : 0
                break
            case Type.TInt:
                val = valRead ? Number(DecodeInt64(r, valueLen)) : 0
                break
            case Type.TUint:
                val = valRead ? Number(DecodeUint64(r, valueLen)) : 0
                break
            case Type.TFloat: {
                if (!valRead) {
                    val = 0
                    break
                }
                const bits = DecodeUint64(r, valueLen)
                val = valueLen <= 4
                    ? Float32FromBits(bits & 0xFFFFFFFFn)
                    : Float64FromBits(bits)
                break
            }
            case Type.TBytes: {
                if (!valRead) {
                    val = 0
                    break
                }
                const size = DecodeUint64(r, valueLen)
                val = Number(utf8Decode(r.readBytes(Number(size))))
                break
            }
            default:
                throw new HBufError("invalid float type")
        }
        return this.isDouble ? val : Math.fround(val)
    }
}

export class FloatDescriptor extends FloatBase {
    constructor(isPtr = false) {
        super(isPtr, false)
    }

    public zero(): any {
        return this.isPtr ? null : 0
    }

    protected toBits(v: number): bigint {
        return Float32Bits(Math.fround(v))
    }
}

export class DoubleDescriptor extends FloatBase {
    constructor(isPtr = false) {
        super(isPtr, true)
    }

    public zero(): any {
        return this.isPtr ? null : 0
    }

    protected toBits(v: number): bigint {
        return Float64Bits(v)
    }
}

/** Bool：值编码在 TAG 的 valueLen 位（1=false, 2=true），无 VALUE 字节。 */
export class BoolDescriptor implements Descriptor {
    constructor(private isPtr = false) {
    }

    factory(): boolean {
        return false
    }

    public fromJson(json: JsonValue, target?: any) {
        if (json !== null) {
            if (typeof json === 'boolean' || typeof json === 'string') {
                return Boolean(json)
            }
        }
        return this.isPtr ? null : this.factory()
    }

    public toJson(v: any): JsonValue {
        return v
    }

    public zero(): any {
        return this.isPtr ? null : false
    }

    public isEmpty(v: any): boolean {
        if (v == null) {
            return true
        }
        return !this.isPtr && v === false
    }

    public encode(buf: Writer, v: any, id?: number): void {
        if (id !== undefined) {
            if (v == null || (!this.isPtr && v === false)) {
                return
            }
            WriterType(buf, Type.TBool, LengthId(id), v ? 2 : 1)
            WriterId(buf, id)
        } else {
            if (v == null) {
                WriterType(buf, Type.TBool, 0, 1)
                return
            }
            WriterType(buf, Type.TBool, 1, v ? 2 : 1)
        }
    }

    public decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        let val: boolean
        switch (typ) {
            case Type.TBool:
                val = valueLen === 2
                break
            case Type.TInt:
                val = valRead && DecodeInt64(r, valueLen) !== 0n
                break
            case Type.TUint:
                val = valRead && DecodeUint64(r, valueLen) !== 0n
                break
            case Type.TFloat: {
                if (!valRead) {
                    val = false
                    break
                }
                const bits = DecodeUint64(r, valueLen)
                val = valueLen <= 4
                    ? Float32FromBits(bits & 0xFFFFFFFFn) !== 0
                    : Float64FromBits(bits) !== 0
                break
            }
            case Type.TBytes: {
                if (!valRead) {
                    val = false
                    break
                }
                const size = DecodeUint64(r, valueLen)
                val = "true" === utf8Decode(r.readBytes(Number(size))).toLowerCase()
                break
            }
            default:
                throw new HBufError("invalid bool type")
        }
        return val
    }
}

/** String：UTF-8 编码为 TBytes。 */
export class StringDescriptor implements Descriptor {
    constructor(private isPtr = false) {
    }

    factory(): string {
        return ""
    }

    public fromJson(json: JsonValue, target?: any) {
        if (json !== null) {
            if (typeof json === 'string' || typeof json === 'number' || typeof json === 'boolean') {
                return String(json)
            }
        }
        return this.isPtr ? null : this.factory()
    }

    public toJson(v: any): JsonValue {
        return v
    }

    public zero(): any {
        return this.isPtr ? null : ""
    }

    public isEmpty(v: any): boolean {
        if (v == null) {
            return true
        }
        return !this.isPtr && v.length === 0
    }

    public encode(buf: Writer, v: any, id?: number): void {
        if (id !== undefined) {
            if (this.isEmpty(v)) {
                return
            }
            const val = utf8Encode(v)
            WriterType(buf, Type.TBytes, LengthId(id), LengthUint(BigInt(val.length)))
            WriterId(buf, id)
            EncodeUint64(buf, BigInt(val.length))
            buf.writeBytes(val)
        } else {
            if (v == null) {
                WriterType(buf, Type.TBytes, 0, 1)
                return
            }
            const val = utf8Encode(v)
            if (val.length === 0) {
                WriterType(buf, Type.TBytes, 0, 1)
                return
            }
            WriterType(buf, Type.TBytes, 1, LengthUint(BigInt(val.length)))
            EncodeUint64(buf, BigInt(val.length))
            buf.writeBytes(val)
        }
    }

    public decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        let val: string
        switch (typ) {
            case Type.TBool:
                val = valueLen === 2 ? "true" : "false"
                break
            case Type.TInt:
                val = valRead ? DecodeInt64(r, valueLen).toString() : ""
                break
            case Type.TUint:
                val = valRead ? DecodeUint64(r, valueLen).toString() : ""
                break
            case Type.TFloat: {
                if (!valRead) {
                    val = ""
                    break
                }
                const bits = DecodeUint64(r, valueLen)
                val = (valueLen <= 4
                    ? Float32FromBits(bits & 0xFFFFFFFFn)
                    : Float64FromBits(bits)).toString()
                break
            }
            case Type.TBytes: {
                if (!valRead) {
                    val = ""
                    break
                }
                const size = DecodeUint64(r, valueLen)
                val = utf8Decode(r.readBytes(Number(size)))
                break
            }
            default:
                throw new HBufError("invalid string type")
        }
        return val
    }
}

/** Bytes：任意字节序列。 */
export class BytesDescriptor implements Descriptor {
    constructor(private isPtr = false) {
    }

    factory(): ArrayBuffer {
        return new ArrayBuffer(0)
    }

    public fromJson(json: JsonValue, target?: any) {
        return json
    }

    public toJson(v: any): JsonValue {
        return v
    }

    public zero(): any {
        return null
    }

    public isEmpty(v: any): boolean {
        if (v == null) {
            return true
        }
        return !this.isPtr && v.length === 0
    }

    public encode(buf: Writer, v: any, id?: number): void {
        if (id !== undefined) {
            if (this.isEmpty(v)) {
                return
            }
            WriterType(buf, Type.TBytes, LengthId(id), LengthUint(BigInt(v.length)))
            WriterId(buf, id)
            EncodeUint64(buf, BigInt(v.length))
            buf.writeBytes(v)
        } else {
            if (v == null) {
                WriterType(buf, Type.TBytes, 0, 1)
                return
            }
            if (v.length === 0) {
                WriterType(buf, Type.TBytes, 0, 1)
                return
            }
            WriterType(buf, Type.TBytes, 1, LengthUint(BigInt(v.length)))
            EncodeUint64(buf, BigInt(v.length))
            buf.writeBytes(v)
        }
    }

    public decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        let val: Uint8Array
        switch (typ) {
            case Type.TBool:
                val = utf8Encode(valueLen === 2 ? "true" : "false")
                break
            case Type.TInt:
                val = valRead ? utf8Encode(DecodeInt64(r, valueLen).toString()) : new Uint8Array(0)
                break
            case Type.TUint:
                val = valRead ? utf8Encode(DecodeUint64(r, valueLen).toString()) : new Uint8Array(0)
                break
            case Type.TFloat: {
                if (!valRead) {
                    val = new Uint8Array(0)
                    break
                }
                const bits = DecodeUint64(r, valueLen)
                val = utf8Encode((valueLen <= 4
                    ? Float32FromBits(bits & 0xFFFFFFFFn)
                    : Float64FromBits(bits)).toString())
                break
            }
            case Type.TBytes: {
                if (!valRead) {
                    val = new Uint8Array(0)
                    break
                }
                const size = DecodeUint64(r, valueLen)
                val = r.readBytes(Number(size))
                break
            }
            default:
                throw new HBufError("invalid bytes type")
        }
        return val
    }
}

/** Time：42 位秒 + 30 位纳秒，固定 9 字节。TS 侧以 Date 承载（毫秒精度）。 */
export class TimeDescriptor implements Descriptor {
    constructor(private isPtr = false) {
    }

    factory(): Date {
        return new Date(0)
    }

    public fromJson(json: JsonValue, target?: any) {
        if (json != null) {
            if (typeof json === "number" || typeof json === "string") {
                return new Date(Number(json))
            }
        }
        // 与 zero()/decode 一致：零时间恒用 null 表示（无论是否可空）
        return null
    }

    public toJson(v: any): JsonValue {
        return v == null ? null : (v as Date).getTime()
    }

    public zero(): any {
        return null
    }

    public isEmpty(v: any): boolean {
        return v == null
    }

    public encode(buf: Writer, v: any, id?: number): void {
        if (id !== undefined) {
            if (v == null) {
                return
            }
            WriterType(buf, Type.TBytes, LengthId(id), 1)
            WriterId(buf, id)
            EncodeUint64(buf, 9n)
            const {secs, nsec} = DateToTime(v)
            EncodeTime(buf, secs, nsec)
        } else {
            if (v == null) {
                WriterType(buf, Type.TBytes, 0, 1)
                return
            }
            WriterType(buf, Type.TBytes, 1, 1)
            EncodeUint64(buf, 9n)
            const {secs, nsec} = DateToTime(v)
            EncodeTime(buf, secs, nsec)
        }
    }

    public decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        if (typ !== Type.TBytes) {
            throw new HBufError("invalid time type")
        }
        if (!valRead) {
            return null
        }
        const size = DecodeUint64(r, valueLen)
        if (size !== 9n) {
            throw new HBufError("invalid time type")
        }
        const {secs, nsec} = DecodeTime(r)
        return TimeToDate(secs, nsec)
    }
}

/** decimal 统一转十进制文本：Decimal 实例用固定点全精度（toString 大数会指数化，破坏 wire 文本）。 */
function DecimalToStr(v: any): string {
    if (v instanceof Decimal) {
        return v.toFixed(Math.max(0, v.decimalPlaces()))
    }
    return String(v)
}

/** Decimal：以 decimal.js Decimal 承载（wire 上为十进制文本）。 */
export class DecimalDescriptor implements Descriptor {
    constructor(private isPtr = false) {
    }

    factory(): any {
        return new Decimal(0)
    }

    public fromJson(json: JsonValue, target?: any) {
        if (json != null) {
            if (typeof json === "string" || typeof json === "number") {
                return new Decimal(json)
            }
        }
        return this.isPtr ? null : this.factory()
    }

    public toJson(v: any): JsonValue {
        return v == null ? null : DecimalToStr(v)
    }

    public zero(): any {
        return this.isPtr ? null : new Decimal(0)
    }

    public isEmpty(v: any): boolean {
        if (v == null) {
            return true
        }
        return !this.isPtr && Number(v) === 0
    }

    public encode(buf: Writer, v: any, id?: number): void {
        if (id !== undefined) {
            if (this.isEmpty(v)) {
                return
            }
            const val = utf8Encode(DecimalToStr(v))
            WriterType(buf, Type.TBytes, LengthId(id), LengthUint(BigInt(val.length)))
            WriterId(buf, id)
            EncodeUint64(buf, BigInt(val.length))
            buf.writeBytes(val)
        } else {
            if (v == null) {
                WriterType(buf, Type.TBytes, 0, 1)
                return
            }
            const val = utf8Encode(DecimalToStr(v))
            if (Number(v) === 0 || val.length === 0) {
                WriterType(buf, Type.TBytes, 0, 1)
                return
            }
            WriterType(buf, Type.TBytes, 1, LengthUint(BigInt(val.length)))
            EncodeUint64(buf, BigInt(val.length))
            buf.writeBytes(val)
        }
    }

    public decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        let val: Decimal
        switch (typ) {
            case Type.TBool:
                val = valueLen === 2 ? new Decimal(1) : new Decimal(0)
                break
            case Type.TInt:
                val = new Decimal(valRead ? DecodeInt64(r, valueLen).toString() : "0")
                break
            case Type.TUint:
                val = new Decimal(valRead ? DecodeUint64(r, valueLen).toString() : "0")
                break
            case Type.TFloat: {
                if (!valRead) {
                    val = new Decimal(0)
                    break
                }
                const bits = DecodeUint64(r, valueLen)
                val = new Decimal((valueLen <= 4
                    ? Float32FromBits(bits & 0xFFFFFFFFn)
                    : Float64FromBits(bits)).toString())
                break
            }
            case Type.TBytes: {
                if (!valRead) {
                    val = new Decimal(0)
                    break
                }
                const size = DecodeUint64(r, valueLen)
                val = new Decimal(utf8Decode(r.readBytes(Number(size))))
                break
            }
            default:
                throw new HBufError("invalid decimal type")
        }
        return val
    }
}

/** List：元素按「元素」规则编码（无 ID 字节）。 */
export class ListDescriptor implements Descriptor {
    constructor(private desc: Descriptor, private isPtr = false) {
    }

    factory(): any {
        return []
    }

    public fromJson(json: JsonValue, target?: any) {
        if (Array.isArray(json)) {
            const list: any[] = []
            for (const item of json) {
                list.push(this.desc.fromJson(item))
            }
            return list
        }
        return this.isPtr ? null : this.factory()
    }

    public toJson(v: any): JsonValue {
        if (v == null) {
            return null
        }
        const list: JsonValue[] = []
        for (const item of v) {
            list.push(this.desc.toJson(item))
        }
        return list
    }

    public zero(): any {
        return null
    }

    public isEmpty(v: any): boolean {
        if (v == null) {
            return true
        }
        return !this.isPtr && v.length === 0
    }

    public encode(buf: Writer, v: any, id?: number): void {
        if (id !== undefined) {
            if (this.isEmpty(v)) {
                return
            }
            WriterType(buf, Type.TList, LengthId(id), LengthUint(BigInt(v.length)))
            WriterId(buf, id)
            EncodeUint64(buf, BigInt(v.length))
        } else {
            if (v == null) {
                WriterType(buf, Type.TList, 0, 1)
                return
            }
            if (v.length === 0) {
                WriterType(buf, Type.TList, 0, 1)
                return
            }
            WriterType(buf, Type.TList, 1, LengthUint(BigInt(v.length)))
            EncodeUint64(buf, BigInt(v.length))
        }
        for (const item of v) {
            this.desc.encode(buf, item, undefined)
        }
    }

    public decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        if (typ !== Type.TList) {
            throw new HBufError("invalid list type")
        }
        // 与 Go 一致：count==0 / 空标记（valRead=false）不触碰字段（返回 undefined 表示保持原值）
        if (!valRead) {
            return undefined
        }
        const count = DecodeUint64(r, valueLen)
        if (count === 0n) {
            return undefined
        }
        const list: any[] = []
        for (let i = 0n; i < count; i++) {
            const {typ: t, idLen, valueLen: vLen} = DecodeType(r)
            if (idLen > 0) {
                // 嵌套容器 count==0 返回 undefined -> 零值 null（与 Go 元素零值 nil 一致）
                list.push(this.desc.decode(r, t, idLen === 1, vLen) ?? null)
            } else {
                list.push(this.desc.zero())
            }
        }
        return list
    }
}

/** Map：key/value 均按「元素」规则编码。 */
export class MapDescriptor implements Descriptor {
    constructor(private keyDesc: Descriptor, private valueDesc: Descriptor, private isPtr = false) {
    }

    factory(): any {
        return new Map()
    }

    public fromJson(json: JsonValue, target?: any): any {
        if (json != null) {
            const _json = json as Record<string, JsonValue>
            const map = new Map()
            for (const [k, v] of Object.entries(_json)) {
                map.set(this.keyDesc.fromJson(k), this.valueDesc.fromJson(v))
            }
            return map
        }
        return this.isPtr ? null : this.factory()
    }

    public toJson(val: any): JsonValue {
        if (val == null) {
            return null
        }
        const map: Record<string, JsonValue> = {}
        for (const [k, v] of val) {
            map[String(this.keyDesc.toJson(k))] = this.valueDesc.toJson(v)
        }
        return map
    }

    public zero(): any {
        return null
    }

    public isEmpty(v: any): boolean {
        if (v == null) {
            return true
        }
        return !this.isPtr && v.size === 0
    }

    public encode(buf: Writer, v: any, id?: number): void {
        if (id !== undefined) {
            if (this.isEmpty(v)) {
                return
            }
            WriterType(buf, Type.TMap, LengthId(id), LengthUint(BigInt(v.size)))
            WriterId(buf, id)
            EncodeUint64(buf, BigInt(v.size))
        } else {
            if (v == null) {
                WriterType(buf, Type.TMap, 0, 1)
                return
            }
            if (v.size === 0) {
                WriterType(buf, Type.TMap, 0, 1)
                return
            }
            WriterType(buf, Type.TMap, 1, LengthUint(BigInt(v.size)))
            EncodeUint64(buf, BigInt(v.size))
        }
        for (const [k, val] of v) {
            this.keyDesc.encode(buf, k, undefined)
            this.valueDesc.encode(buf, val, undefined)
        }
    }

    public decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        if (typ !== Type.TMap) {
            throw new HBufError("invalid map type")
        }
        // 与 Go 一致：count==0 / 空标记（valRead=false）不触碰字段（返回 undefined 表示保持原值）
        if (!valRead) {
            return undefined
        }
        const count = DecodeUint64(r, valueLen)
        if (count === 0n) {
            return undefined
        }
        const m = new Map()
        for (let i = 0n; i < count; i++) {
            let {typ: t, idLen, valueLen: vLen} = DecodeType(r)
            const k = idLen > 0 ? this.keyDesc.decode(r, t, idLen === 1, vLen) ?? null : this.keyDesc.zero()
            ;({typ: t, idLen, valueLen: vLen} = DecodeType(r))
            const val = idLen > 0 ? this.valueDesc.decode(r, t, idLen === 1, vLen) ?? null : this.valueDesc.zero()
            m.set(k, val)
        }
        return m
    }
}

/** 字段描述：描述符 + get/set 闭包（替代 Go 的 unsafe.Offsetof）。 */
export type FieldDesc = {
    desc: Descriptor
    get: (o: any) => any
    set: (o: any, v: any) => void
    name?: string,
}

type Field = FieldDesc & { id: number }

/**
 * DataDescriptor：字段按 ID 升序编码，尾部跟 EXTENDS-BLOCK。
 */
export class DataDescriptor implements Descriptor {
    public factory: () => any
    private fields: Field[]          // 按 ID 升序
    private fieldMap: Map<number, FieldDesc>
    private extends_: Field[]        // 按扩展 ID 升序
    private extendMap: Map<number, FieldDesc>
    private isPtr: boolean

    constructor(factory: () => any, fields: Map<number, FieldDesc>, extends_: Map<number, FieldDesc> = new Map(), isPtr = false) {
        this.factory = factory
        this.isPtr = isPtr
        this.fields = Array.from(fields, ([id, f]) => ({...f, id})).sort((a, b) => a.id - b.id)
        this.fieldMap = fields
        this.extends_ = Array.from(extends_, ([id, f]) => ({...f, id})).sort((a, b) => a.id - b.id)
        this.extendMap = extends_
    }

    public fromJson(json: JsonValue, target?: any): any {
        if (json != null) {
            const ret: any = target ?? this.factory()
            const _json = json as Record<string, JsonValue>
            for (const field of this.fields) {
                if (field.name && _json[field.name] !== undefined) {
                    field.set(ret, field.desc.fromJson(_json[field.name]))
                }
            }
            for (const f of this.extends_) {
                f.desc.fromJson(_json, ret)
            }
            return ret
        }
        return this.isPtr ? null : this.factory()
    }

    public toJson(v: any): JsonValue {
        if (v == null) {
            return null
        }
        let ret: Record<string, any> = {}

        for (const [_, field] of this.extendMap) {
            ret = {...ret, ...field.desc.toJson(field.get(v)) as Record<string, any>}
        }
        for (const field of this.fields) {
            if (field.name) {
                ret[field.name] = field.desc.toJson(field.get(v))
            }
        }
        return ret
    }

    public zero(): any {
        return null
    }

    public isEmpty(v: any): boolean {
        return v == null
    }

    public encode(buf: Writer, v: any, id?: number): void {
        if (id !== undefined) {
            if (v == null) {
                return
            }
            let count = 0
            for (const f of this.fields) {
                if (!f.desc.isEmpty(f.get(v))) {
                    count++
                }
            }
            WriterType(buf, Type.TData, LengthId(id), LengthUint(BigInt(count)))
            WriterId(buf, id)
            EncodeUint64(buf, BigInt(count))
        } else {
            if (v == null) {
                if (this.isPtr) {
                    WriterType(buf, Type.TData, 0, 1)
                } else {
                    // 与 Go 一致：值元素（非指针）零值写 3 字节空结构（TAG | count=0 | EXTENDS）
                    WriterType(buf, Type.TData, 1, 1)
                    EncodeUint64(buf, 0n)
                    WriterType(buf, Type.TInt, 0, 1)
                }
                return
            }
            let count = 0
            for (const f of this.fields) {
                if (!f.desc.isEmpty(f.get(v))) {
                    count++
                }
            }
            WriterType(buf, Type.TData, 1, LengthUint(BigInt(count)))
            EncodeUint64(buf, BigInt(count))
        }
        for (const f of this.fields) {
            const val = f.get(v)
            if (!f.desc.isEmpty(val)) {
                f.desc.encode(buf, val, f.id)
            }
        }
        // EXTENDS-BLOCK
        if (this.extends_.length === 0) {
            WriterType(buf, Type.TInt, 0, 1)
        } else {
            WriterType(buf, Type.TInt, 1, LengthUint(BigInt(this.extends_.length)))
            EncodeUint64(buf, BigInt(this.extends_.length))
            for (const f of this.extends_) {
                const val = f.get(v)
                if (!f.desc.isEmpty(val)) {
                    f.desc.encode(buf, val, f.id)
                }
            }
        }
    }

    public decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        if (typ !== Type.TData) {
            throw new HBufError("invalid data type")
        }
        // 与 Go 一致：isPtr 每次解码都分配新实例（覆盖旧指针）；非 isPtr 复用 target
        const v = this.isPtr ? this.factory() : (target ?? this.factory())
        const count = valRead ? DecodeUint64(r, valueLen) : 0n
        for (let i = 0n; i < count; i++) {
            const {typ: t, idLen, valueLen: vLen} = DecodeType(r)
            const id = DecodeId(r, idLen)
            const field = this.fieldMap.get(id)
            if (field) {
                // 传当前字段值作 target：嵌套 data 就地填充；count==0 容器返回 undefined 时跳过（Go 不触碰）
                const cur = field.get(v)
                const dv = field.desc.decode(r, t, true, vLen, cur)
                if (dv !== undefined) {
                    field.set(v, dv)
                }
            } else {
                SkipValue(r, t, vLen)
            }
        }
        // EXTENDS-BLOCK
        const {idLen, valueLen: eValLen} = DecodeType(r)
        if (idLen > 0) {
            const extCount = DecodeUint64(r, eValLen)
            for (let i = 0n; i < extCount; i++) {
                const {typ: t, idLen: eIdLen, valueLen: eVLen} = DecodeType(r)
                const id = DecodeId(r, eIdLen)
                const field = this.extendMap.get(id)
                if (field) {
                    const cur = field.get(v)
                    const dv = field.desc.decode(r, t, true, eVLen, cur)
                    if (dv !== undefined) {
                        field.set(v, dv)
                    }
                } else {
                    SkipValue(r, t, eVLen)
                }
            }
        }
        // 与 Go 一致：非 isPtr 且 count==0 的字段级解码不触碰原值；
        // 元素级（无 target）返回新实例（Go 值元素保持零值结构）
        if (count === 0n && !this.isPtr && target !== undefined) {
            return undefined
        }
        return v
    }


}

/**
 * RefDescriptor：包装引用（递归结构）。TS 无 unsafe 偏移，透传目标描述符，
 * 额外处理 isPtr 语义（可空 data 元素的空标记，与 Go RefDescriptor 一致）。
 */
export class RefDescriptor implements Descriptor {
    private cache: Descriptor | null = null
    private getDesc: (() => Descriptor) | null = null

    constructor(getDesc: () => Descriptor, private isPtr = false) {
        this.getDesc = getDesc
    }

    get desc(): Descriptor {
        if (this.cache === null) {
            this.cache = this.getDesc!()
        }
        return this.cache
    }

    factory(): any {
        return this.desc.factory()
    }

    public toJson(v: any): JsonValue {
        if (v == null) {
            return null
        }
        return this.desc.toJson(v)
    }

    public fromJson(json: JsonValue, target?: any) {
        if (json == null && this.isPtr) {
            return null
        }
        return this.desc.fromJson(json, target)
    }

    public zero(): any {
        return null
    }

    public isEmpty(v: any): boolean {
        return v == null
    }

    public encode(buf: Writer, v: any, id?: number): void {
        if (id !== undefined) {
            if (v == null) {
                return
            }
            this.desc.encode(buf, v, id)
        } else {
            if (v == null) {
                if (this.isPtr) {
                    WriterType(buf, Type.TData, 0, 1)
                } else {
                    // 与 Go 一致：值元素（非指针）零值写 3 字节空结构
                    this.desc.encode(buf, null, undefined)
                }
                return
            }
            this.desc.encode(buf, v, undefined)
        }
    }

    public decode(r: Reader, typ: Type, valRead: boolean, valueLen: number, target?: any): any {
        // isPtr 时不复用 target：与 Go 一致每次解码分配新实例
        return this.desc.decode(r, typ, valRead, valueLen, this.isPtr ? undefined : target)
    }
}
