import {test} from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import {Marshal, Unmarshal} from "../src";
import {buildFull, buildNoMap, deepEq, HBufTestTs, hbTestDesc} from "./hbuf128";

function bytesToHex(b: Uint8Array): string {
    return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")
}

function hexToBytes(hex: string): Uint8Array {
    const ret = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
        ret[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }
    return ret
}

// ===================== 测试 =====================

test("HBufTest 128 字段: TS 编码与 Go 字节级一致（无 map 场景）", () => {
    const nomapHex = fs.readFileSync(new URL("./golden_nomap.hex", import.meta.url), "utf-8").trim()
    const buf = Marshal(buildNoMap())
    assert.strictEqual(bytesToHex(buf), nomapHex)
})

test("HBufTest 128 字段: TS 解码 Go full 数据，128 字段语义一致", () => {
    const fullHex = fs.readFileSync(new URL("./golden_full.hex", import.meta.url), "utf-8").trim()
    const dst = new HBufTestTs()
    Unmarshal(hexToBytes(fullHex), dst)
    deepEq(dst, buildFull())
})

test("HBufTest 128 字段: TS 编码长度与 Go 一致", () => {
    assert.strictEqual(Marshal(buildFull()).length, 16942)
    assert.strictEqual(Marshal(buildNoMap()).length, 2599)
})

test("HBufTest 128 字段: TS round-trip", () => {
    const src = buildFull()
    const dst = new HBufTestTs()
    Unmarshal(Marshal(src), dst)
    deepEq(dst, src)
})

test("toJson/fromJson: 128 字段 JSON 往返语义一致", () => {
    const src = buildFull()
    const dst = hbTestDesc.fromJson(hbTestDesc.toJson(src)) as HBufTestTs
    // decimal 字段经 fromJson 后为 Decimal 实例（与源字符串数值相等），deepEq 已兼容
    deepEq(dst, src)
})
