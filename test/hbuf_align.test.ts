// TS 与 Go 完全对齐验证：空容器元素 / count==0 语义 / 可空容器字段 / 跨类型矩阵。
// golden 数据由 Go 端 golden_align_gen_test.go 生成（test/golden_align.json）。
import {test} from "node:test"
import assert from "node:assert/strict"
import * as fs from "node:fs"
import {HData, Marshal, Unmarshal, Writer} from "../src/hbuf/data"
import {
    Descriptor, FieldDesc, NewBoolDescriptor, NewBytesDescriptor, NewDataDescriptor, NewDecimalDescriptor,
    NewDoubleDescriptor, NewFloatDescriptor, NewInt8Descriptor, NewInt16Descriptor, NewInt32Descriptor,
    NewInt64Descriptor, NewListDescriptor, NewMapDescriptor, NewRefDescriptor, NewStringDescriptor,
    NewUint8Descriptor, NewUint16Descriptor, NewUint32Descriptor, NewUint64Descriptor,
} from "../src/hbuf/descriptor"
import {EncodeUint64, LengthId, LengthUint, WriterId, WriterInt64, WriterType} from "../src/hbuf/encoder"
import {Type} from "../src/hbuf/data"

function bytesToHex(b: Uint8Array): string {
    return Buffer.from(b).toString("hex")
}

function hexToBytes(s: string): Uint8Array {
    return new Uint8Array(Buffer.from(s, "hex"))
}

// ================= 对齐验证类型（与 Go coverage_test.go 的类型对应） =================

class AlignSubTs implements HData {
    a1: bigint = 0n
    a2: bigint | null = null

    descriptors(): Descriptor {
        return alignSubDesc
    }
}

const alignSubDesc: Descriptor = NewDataDescriptor(
    () => new AlignSubTs(),
    new Map<number, FieldDesc>([
        [1, {desc: NewInt64Descriptor(false), get: (o: AlignSubTs) => o.a1, set: (o: AlignSubTs, v) => o.a1 = v}],
        [2, {desc: NewInt64Descriptor(true), get: (o: AlignSubTs) => o.a2, set: (o: AlignSubTs, v) => o.a2 = v}],
    ]),
)

class AlignTs implements HData {
    v4: number[] | null = null          // *[]int16（可空列表字段）
    v5: Map<bigint, number> | null = null // *map[int64]int16（可空 map 字段）
    v31: AlignSubTs = new AlignSubTs()  // 非指针 data 字段
    v32: AlignSubTs | null = null       // 指针 data 字段
    v53: (Uint8Array | null)[] = []    // [][]byte（元素可 nil）
    v63: AlignSubTs[] = []              // 值 data 元素
    v64: (AlignSubTs | null)[] = []     // 指针 data 元素

    descriptors(): Descriptor {
        return alignDesc
    }
}

const alignDesc: Descriptor = NewDataDescriptor(
    () => new AlignTs(),
    new Map<number, FieldDesc>([
        [4, {desc: NewListDescriptor(NewInt16Descriptor(false), true), get: (o: AlignTs) => o.v4, set: (o: AlignTs, v) => o.v4 = v}],
        [5, {desc: NewMapDescriptor(NewInt64Descriptor(false), NewInt16Descriptor(false), true), get: (o: AlignTs) => o.v5, set: (o: AlignTs, v) => o.v5 = v}],
        [31, {desc: NewRefDescriptor(alignSubDesc, false), get: (o: AlignTs) => o.v31, set: (o: AlignTs, v) => o.v31 = v}],
        [32, {desc: NewRefDescriptor(alignSubDesc, true), get: (o: AlignTs) => o.v32, set: (o: AlignTs, v) => o.v32 = v}],
        [53, {desc: NewListDescriptor(NewBytesDescriptor(false), false), get: (o: AlignTs) => o.v53, set: (o: AlignTs, v) => o.v53 = v}],
        [63, {desc: NewListDescriptor(NewRefDescriptor(alignSubDesc, false), false), get: (o: AlignTs) => o.v63, set: (o: AlignTs, v) => o.v63 = v}],
        [64, {desc: NewListDescriptor(NewRefDescriptor(alignSubDesc, true), false), get: (o: AlignTs) => o.v64, set: (o: AlignTs, v) => o.v64 = v}],
    ]),
)

function buildEmptyElements(): AlignTs {
    const v = new AlignTs()
    v.v53 = [null, null, new Uint8Array([1])] // Go: [][]byte{nil, {}, {1}}
    const sub1 = new AlignSubTs()
    const sub2 = new AlignSubTs()
    sub2.a1 = 7n
    v.v63 = [sub1, sub2]
    v.v64 = [null, new AlignSubTs()]
    return v
}

// ================= 跨类型矩阵类型（字段 id 与 Go HBufTest 一致） =================

class MatrixTs implements HData {
    v1: number = 0       // int8
    v3: number = 0       // int16
    v5: number = 0       // int32
    v7: bigint = 0n      // int64
    v9: number = 0       // uint8
    v11: number = 0      // uint16
    v13: number = 0      // uint32
    v15: bigint = 0n     // uint64
    v23: number = 0      // float
    v25: number = 0      // double
    v17: boolean = false // bool
    v19: string = ""     // string
    v21: Uint8Array = new Uint8Array(0) // bytes
    v29: string = ""     // decimal

    descriptors(): Descriptor {
        return matrixDesc
    }
}

const matrixDesc: Descriptor = NewDataDescriptor(
    () => new MatrixTs(),
    new Map<number, FieldDesc>([
        [1, {desc: NewInt8Descriptor(false), get: (o: MatrixTs) => o.v1, set: (o: MatrixTs, v) => o.v1 = v}],
        [3, {desc: NewInt16Descriptor(false), get: (o: MatrixTs) => o.v3, set: (o: MatrixTs, v) => o.v3 = v}],
        [5, {desc: NewInt32Descriptor(false), get: (o: MatrixTs) => o.v5, set: (o: MatrixTs, v) => o.v5 = v}],
        [7, {desc: NewInt64Descriptor(false), get: (o: MatrixTs) => o.v7, set: (o: MatrixTs, v) => o.v7 = v}],
        [9, {desc: NewUint8Descriptor(false), get: (o: MatrixTs) => o.v9, set: (o: MatrixTs, v) => o.v9 = v}],
        [11, {desc: NewUint16Descriptor(false), get: (o: MatrixTs) => o.v11, set: (o: MatrixTs, v) => o.v11 = v}],
        [13, {desc: NewUint32Descriptor(false), get: (o: MatrixTs) => o.v13, set: (o: MatrixTs, v) => o.v13 = v}],
        [15, {desc: NewUint64Descriptor(false), get: (o: MatrixTs) => o.v15, set: (o: MatrixTs, v) => o.v15 = v}],
        [17, {desc: NewBoolDescriptor(false), get: (o: MatrixTs) => o.v17, set: (o: MatrixTs, v) => o.v17 = v}],
        [19, {desc: NewStringDescriptor(false), get: (o: MatrixTs) => o.v19, set: (o: MatrixTs, v) => o.v19 = v}],
        [21, {desc: NewBytesDescriptor(false), get: (o: MatrixTs) => o.v21, set: (o: MatrixTs, v) => o.v21 = v}],
        [23, {desc: NewFloatDescriptor(false), get: (o: MatrixTs) => o.v23, set: (o: MatrixTs, v) => o.v23 = v}],
        [25, {desc: NewDoubleDescriptor(false), get: (o: MatrixTs) => o.v25, set: (o: MatrixTs, v) => o.v25 = v}],
        [29, {desc: NewDecimalDescriptor(false), get: (o: MatrixTs) => o.v29, set: (o: MatrixTs, v) => o.v29 = v}],
    ]),
)

// 手工构造跨类型输入（与 Go coverage_test.go crossInputs 一致：bool/int/uint/float/bytes）
function tsCrossInputs(id: number): Uint8Array[] {
    const inputs: Uint8Array[] = []
    // TBool(true)
    const wb = new Writer()
    WriterType(wb, Type.TBool, LengthId(id), 2)
    WriterId(wb, id)
    inputs.push(wb.toUint8Array())
    // TInt(42)
    const wi = new Writer()
    WriterType(wi, Type.TInt, LengthId(id), 1)
    WriterId(wi, id)
    WriterInt64(wi, 42n)
    inputs.push(wi.toUint8Array())
    // TUint(43)
    const wu = new Writer()
    WriterType(wu, Type.TUint, LengthId(id), 1)
    WriterId(wu, id)
    EncodeUint64(wu, 43n)
    inputs.push(wu.toUint8Array())
    // TFloat(3.5)
    const f64View = new Float64Array(1)
    const bits = new BigUint64Array(f64View.buffer)
    f64View[0] = 3.5
    const wf = new Writer()
    WriterType(wf, Type.TFloat, LengthId(id), LengthUint(bits[0]))
    WriterId(wf, id)
    EncodeUint64(wf, bits[0])
    inputs.push(wf.toUint8Array())
    // TBytes("44")
    const ws = new Writer()
    const txt = new TextEncoder().encode("44")
    WriterType(ws, Type.TBytes, LengthId(id), LengthUint(BigInt(txt.length)))
    WriterId(ws, id)
    EncodeUint64(ws, BigInt(txt.length))
    ws.writeBytes(txt)
    inputs.push(ws.toUint8Array())
    return inputs
}

// ================= 测试 =================

const golden = JSON.parse(fs.readFileSync(new URL("./golden_align.json", import.meta.url), "utf-8"))

test("对齐: 空容器元素编码字节与 Go 一致", () => {
    const src = buildEmptyElements()
    const hex = bytesToHex(new Uint8Array(Marshal(src)))
    assert.strictEqual(hex, golden.emptyElements.hex)
})

test("对齐: 空容器元素解码语义与 Go 一致", () => {
    const dst = new AlignTs()
    Unmarshal(hexToBytes(golden.emptyElements.hex), dst)
    // Go: V53 -> [nil, nil, {1}]；V63 -> [{}, {a1:7}]；V64 -> [nil, {}]
    assert.strictEqual(dst.v53.length, 3)
    assert.strictEqual(dst.v53[0], null)
    assert.strictEqual(dst.v53[1], null)
    assert.deepStrictEqual(Array.from(dst.v53[2]!), [1])
    assert.strictEqual(dst.v63.length, 2)
    assert.strictEqual(dst.v63[0].a1, 0n)
    assert.strictEqual(dst.v63[1].a1, 7n)
    assert.strictEqual(dst.v64.length, 2)
    assert.strictEqual(dst.v64[0], null)
    assert.strictEqual(dst.v64[1]!.a1, 0n)
})

test("对齐: count==0 的 list/map 解码不触碰原值（与 Go 一致）", () => {
    const dst = new AlignTs()
    dst.v4 = [1, 2]
    dst.v5 = new Map([[1n, 1]])
    Unmarshal(hexToBytes(golden.countZeroList.hex), dst)
    assert.deepStrictEqual(dst.v4, [1, 2], "count==0 list 保持原值")
    Unmarshal(hexToBytes(golden.countZeroMap.hex), dst)
    assert.deepStrictEqual(Array.from(dst.v5!), [[1n, 1]], "count==0 map 保持原值")
})

test("对齐: count==0 的非指针 data 保持原值、指针 data 分配新实例（与 Go 一致）", () => {
    const dst = new AlignTs()
    dst.v31 = new AlignSubTs()
    dst.v31.a1 = 5n
    Unmarshal(hexToBytes(golden.countZeroData.hex), dst)
    assert.strictEqual(dst.v31.a1, 5n, "非指针 data count==0 保持原值")

    const dst2 = new AlignTs()
    const pre = new AlignSubTs()
    pre.a1 = 9n
    dst2.v32 = pre
    Unmarshal(hexToBytes(golden.countZeroPtrData.hex), dst2)
    assert.ok(dst2.v32 !== pre, "指针 data count==0 分配新实例（Go 覆盖旧指针）")
    assert.strictEqual(dst2.v32!.a1, 0n, "新实例为零值")
})

test("对齐: 可空容器字段编码字节与 Go 一致", () => {
    const src = new AlignTs()
    src.v31 = null as any // Go 的 BigListTest 无 data 字段，省略 v31
    src.v4 = [1, -2, 3]
    src.v5 = new Map([[7n, 70], [-8n, 80]])
    const hex = bytesToHex(new Uint8Array(Marshal(src)))
    assert.strictEqual(hex, golden.nullableContainer.hex)
    const dst = new AlignTs()
    Unmarshal(hexToBytes(hex), dst)
    assert.deepStrictEqual(dst.v4, [1, -2, 3])
    assert.deepStrictEqual(Array.from(dst.v5!), [[7n, 70], [-8n, 80]])
})

test("对齐: 跨类型矩阵解码结果与 Go 一致（14 字段 x 5 输入）", () => {
    const fields: [string, number, (o: MatrixTs) => any, boolean][] = [
        ["int8", 1, (o) => o.v1, false],
        ["int16", 3, (o) => o.v3, false],
        ["int32", 5, (o) => o.v5, false],
        ["int64", 7, (o) => o.v7, false],
        ["uint8", 9, (o) => o.v9, false],
        ["uint16", 11, (o) => o.v11, false],
        ["uint32", 13, (o) => o.v13, false],
        ["uint64", 15, (o) => o.v15, false],
        ["float", 23, (o) => o.v23, false],
        ["double", 25, (o) => o.v25, false],
        ["bool", 17, (o) => o.v17, false],
        ["string", 19, (o) => o.v19, false],
        ["bytes", 21, (o) => o.v21, true],
        ["decimal", 29, (o) => o.v29, false],
    ]
    for (const [name, id, get, isBytes] of fields) {
        const inputs = tsCrossInputs(id)
        for (let i = 0; i < 5; i++) {
            const w = new Writer()
            // 包进完整 Data 结构：TAG(TData,1,1) | count=1 | 字段 | EXTENDS
            WriterType(w, Type.TData, 1, 1)
            EncodeUint64(w, 1n)
            w.writeBytes(inputs[i])
            WriterType(w, Type.TInt, 0, 1)
            const dst = new MatrixTs()
            Unmarshal(w.toUint8Array(), dst)
            let got: any = get(dst)
            if (isBytes) {
                got = Buffer.from(got).toString("base64") // 与 Go JSON 的 []byte base64 编码一致
            } else if (typeof got === "bigint") {
                got = Number(got) // Go JSON 中 int64/uint64 为数字
            }
            assert.deepStrictEqual(got, golden.crossMatrix[name][i], `${name} <- 输入[${i}]`)
        }
    }
})
