// src/hbuf/decoder.ts
function DecodeType(reader) {
  const b = reader.readByte();
  return {
    typ: b >> 5 & 7,
    valueLen: (b >> 2 & 7) + 1,
    idLen: b & 3
  };
}
function DecodeId(reader, idLen) {
  switch (idLen) {
    case 0:
      return 0;
    case 1:
      return reader.readByte();
    case 2:
      return reader.readByte() | reader.readByte() << 8;
  }
  throw new ShortBufferError();
}
function DecodeInt64(reader, valueLen) {
  if (valueLen === 0 || valueLen > 8) {
    throw new ShortBufferError();
  }
  let val = 0n;
  for (let i = 0; i < valueLen; i++) {
    val |= BigInt(reader.readByte()) << BigInt(i * 8);
  }
  return BigInt.asIntN(valueLen * 8, val);
}
function DecodeUint64(reader, valueLen) {
  if (valueLen === 0 || valueLen > 8) {
    throw new ShortBufferError();
  }
  let val = 0n;
  for (let i = 0; i < valueLen; i++) {
    val |= BigInt(reader.readByte()) << BigInt(i * 8);
  }
  return val;
}
function DecodeTime(reader) {
  let low64 = 0n;
  for (let i = 0; i < 8; i++) {
    low64 |= BigInt(reader.readByte()) << BigInt(i * 8);
  }
  const high8 = BigInt(reader.readByte());
  const nsec = Number(low64 & 0x3FFFFFFFn);
  const secs = high8 << 34n | low64 >> 30n;
  return { secs, nsec };
}
function SkipValue(reader, typ, valueLen) {
  switch (typ) {
    case 0 /* TInt */:
    case 1 /* TUint */:
    case 2 /* TFloat */:
      reader.readBytes(valueLen);
      return;
    case 3 /* TBool */:
      return;
    case 4 /* TBytes */: {
      const size = DecodeUint64(reader, valueLen);
      reader.readBytes(Number(size));
      return;
    }
    case 5 /* TList */: {
      const count = DecodeUint64(reader, valueLen);
      for (let i = 0n; i < count; i++) {
        const { typ: elemTyp, idLen: elemIdLen, valueLen: elemValLen } = DecodeType(reader);
        if (elemIdLen === 1) {
          SkipValue(reader, elemTyp, elemValLen);
        }
      }
      return;
    }
    case 6 /* TMap */: {
      const count = DecodeUint64(reader, valueLen);
      for (let i = 0n; i < count; i++) {
        const k = DecodeType(reader);
        if (k.idLen === 1) {
          SkipValue(reader, k.typ, k.valueLen);
        }
        const v = DecodeType(reader);
        if (v.idLen === 1) {
          SkipValue(reader, v.typ, v.valueLen);
        }
      }
      return;
    }
    case 7 /* TData */: {
      SkipDataBody(reader, valueLen);
      const { idLen: eIdLen, valueLen: eValLen } = DecodeType(reader);
      if (eIdLen === 0) {
        return;
      }
      SkipDataBody(reader, eValLen);
      return;
    }
  }
  throw new HBufError("hbuf: unknown type");
}
function SkipDataBody(reader, valueLen) {
  const count = DecodeUint64(reader, valueLen);
  for (let i = 0n; i < count; i++) {
    const { typ, idLen, valueLen: vLen } = DecodeType(reader);
    if (idLen > 0) {
      reader.readBytes(idLen);
      SkipValue(reader, typ, vLen);
    }
  }
}

// src/hbuf/data.ts
var Type = /* @__PURE__ */ ((Type3) => {
  Type3[Type3["TInt"] = 0] = "TInt";
  Type3[Type3["TUint"] = 1] = "TUint";
  Type3[Type3["TFloat"] = 2] = "TFloat";
  Type3[Type3["TBool"] = 3] = "TBool";
  Type3[Type3["TBytes"] = 4] = "TBytes";
  Type3[Type3["TList"] = 5] = "TList";
  Type3[Type3["TMap"] = 6] = "TMap";
  Type3[Type3["TData"] = 7] = "TData";
  return Type3;
})(Type || {});
var HBufError = class extends Error {
  constructor(msg) {
    super(msg);
    this.name = "HBufError";
  }
};
var ShortBufferError = class extends HBufError {
  constructor(msg = "hbuf: short buffer") {
    super(msg);
    this.name = "ShortBufferError";
  }
};
var Writer = class {
  constructor(capacity = 128) {
    this.len = 0;
    this.buf = new Uint8Array(capacity);
  }
  get length() {
    return this.len;
  }
  ensure(extra) {
    if (this.len + extra <= this.buf.length) {
      return;
    }
    let cap = this.buf.length * 2;
    while (cap < this.len + extra) {
      cap *= 2;
    }
    const next = new Uint8Array(cap);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }
  writeByte(v) {
    this.ensure(1);
    this.buf[this.len++] = v;
  }
  writeBytes(b) {
    this.ensure(b.length);
    this.buf.set(b, this.len);
    this.len += b.length;
  }
  /** 返回已写入字节的视图（与内部缓冲共享，仅有效至下一次写入前）。 */
  toUint8Array() {
    return this.buf.subarray(0, this.len);
  }
};
var Reader2 = class {
  constructor(buf) {
    this.pos = 0;
    this.buf = buf;
  }
  get position() {
    return this.pos;
  }
  get remaining() {
    return this.buf.length - this.pos;
  }
  readByte() {
    if (this.pos >= this.buf.length) {
      throw new ShortBufferError();
    }
    return this.buf[this.pos++];
  }
  readBytes(n) {
    if (this.remaining < n) {
      throw new ShortBufferError();
    }
    const ret = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return ret;
  }
};
function Marshal(data) {
  const buf = new Writer(128);
  data.descriptors().encode(buf, data, void 0);
  return buf.toUint8Array();
}
function Unmarshal(buf, data, desc) {
  if (buf.length === 0) {
    return;
  }
  const reader = new Reader2(buf);
  const { typ, valueLen } = DecodeType(reader);
  const d = desc ?? data.descriptors();
  d.decode(reader, typ, true, valueLen, data);
}
function isHData(obj) {
  return obj && typeof obj.descriptors === "function";
}

// src/hbuf/encoder.ts
function WriterType(buf, typ, idLen, valueLen) {
  buf.writeByte((typ & 7) << 5 | (valueLen - 1 & 7) << 2 | idLen & 3);
}
function LengthId(id) {
  return id <= 255 ? 1 : 2;
}
function WriterId(buf, id) {
  if (id <= 255) {
    buf.writeByte(id);
  } else {
    buf.writeByte(id & 255);
    buf.writeByte(id >> 8 & 255);
  }
}
function LengthInt(v) {
  if (v >= -0x80n && v < 0x80n) {
    return 1;
  } else if (v >= -0x8000n && v < 0x8000n) {
    return 2;
  } else if (v >= -0x800000n && v < 0x800000n) {
    return 3;
  } else if (v >= -0x80000000n && v < 0x80000000n) {
    return 4;
  } else if (v >= -0x8000000000n && v < 0x8000000000n) {
    return 5;
  } else if (v >= -0x800000000000n && v < 0x800000000000n) {
    return 6;
  } else if (v >= -0x80000000000000n && v < 0x80000000000000n) {
    return 7;
  } else {
    return 8;
  }
}
function LengthUint(v) {
  if (v <= 0xFFn) {
    return 1;
  } else if (v <= 0xFFFFn) {
    return 2;
  } else if (v <= 0xFFFFFFn) {
    return 3;
  } else if (v <= 0xFFFFFFFFn) {
    return 4;
  } else if (v <= 0xFFFFFFFFFFn) {
    return 5;
  } else if (v <= 0xFFFFFFFFFFFFn) {
    return 6;
  } else if (v <= 0xFFFFFFFFFFFFFFn) {
    return 7;
  } else {
    return 8;
  }
}
function WriterInt64(buf, v) {
  const len = LengthInt(v);
  let val = BigInt.asIntN(len * 8, v);
  for (let i = 0; i < len; i++) {
    buf.writeByte(Number(val & 0xFFn));
    val >>= 8n;
  }
}
function EncodeUint64(buf, v) {
  const len = LengthUint(v);
  let val = v;
  for (let i = 0; i < len; i++) {
    buf.writeByte(Number(val & 0xFFn));
    val >>= 8n;
  }
}
function EncodeTime(buf, secs, nsec) {
  const low64 = (secs & 0x3FFFFFFFFn) << 30n | BigInt(nsec) & 0x3FFFFFFFn;
  const high8 = Number(secs >> 34n);
  let val = low64;
  for (let i = 0; i < 8; i++) {
    buf.writeByte(Number(val & 0xFFn));
    val >>= 8n;
  }
  buf.writeByte(high8);
}

// src/hbuf/descriptor.ts
import Decimal from "decimal.js";
var utf8Encoder = new TextEncoder();
var utf8Decoder = new TextDecoder("utf-8");
function utf8Encode(str) {
  return utf8Encoder.encode(str);
}
function utf8Decode(b) {
  return utf8Decoder.decode(b);
}
var f32View = new Float32Array(1);
var f32Bits = new Uint32Array(f32View.buffer);
var f64View = new Float64Array(1);
var f64Bits = new BigUint64Array(f64View.buffer);
function Float32Bits(v) {
  f32View[0] = v;
  return BigInt(f32Bits[0]);
}
function Float32FromBits(b) {
  f32Bits[0] = Number(b & 0xFFFFFFFFn);
  return f32View[0];
}
function Float64Bits(v) {
  f64View[0] = v;
  return f64Bits[0];
}
function Float64FromBits(b) {
  f64Bits[0] = b;
  return f64View[0];
}
function DateToTime(v) {
  const ms = v.getTime();
  return {
    secs: BigInt(Math.floor(ms / 1e3)),
    nsec: ms % 1e3 * 1e6
  };
}
function TimeToDate(secs, nsec) {
  return new Date(Number(secs) * 1e3 + Math.floor(nsec / 1e6));
}
var IntBase = class {
  constructor(isPtr = false) {
    this.isPtr = isPtr;
  }
  clone(val, target) {
    return val;
  }
  /** 元素零值空标记的 idLen（uint8 特例为 2）。 */
  emptyIdLen() {
    return 0;
  }
  isEmptyField(v) {
    if (v == null) {
      return true;
    }
    return !this.isPtr && v === this.zero();
  }
  isEmpty(v) {
    return this.isEmptyField(v);
  }
  encode(buf, v, id) {
    if (id !== void 0) {
      if (this.isEmptyField(v)) {
        return;
      }
      const val = this.toBigInt(v);
      WriterType(buf, this.typ(), LengthId(id), this.length(val));
      WriterId(buf, id);
      this.writeValue(buf, val);
    } else {
      if (v == null) {
        WriterType(buf, this.typ(), this.isPtr ? 0 : this.emptyIdLen(), 1);
        return;
      }
      const val = this.toBigInt(v);
      if (val === 0n) {
        WriterType(buf, this.typ(), this.emptyIdLen(), 1);
        return;
      }
      WriterType(buf, this.typ(), 1, this.length(val));
      this.writeValue(buf, val);
    }
  }
  decode(r, typ, valRead, valueLen, target) {
    let val;
    switch (typ) {
      case 3 /* TBool */:
        val = valueLen === 2 ? 1n : 0n;
        break;
      case 0 /* TInt */:
        val = valRead ? DecodeInt64(r, valueLen) : 0n;
        break;
      case 1 /* TUint */:
        val = valRead ? DecodeUint64(r, valueLen) : 0n;
        break;
      case 2 /* TFloat */: {
        if (!valRead) {
          val = 0n;
          break;
        }
        const bits = DecodeUint64(r, valueLen);
        val = BigInt(Math.trunc(valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)));
        break;
      }
      case 4 /* TBytes */: {
        if (!valRead) {
          val = 0n;
          break;
        }
        const size = DecodeUint64(r, valueLen);
        val = BigInt(utf8Decode(r.readBytes(Number(size))));
        break;
      }
      default:
        throw new HBufError("invalid int type");
    }
    return this.fromBigInt(val);
  }
};
var SignedInt = class extends IntBase {
  constructor(isPtr, bits) {
    super(isPtr);
    this.bits = bits;
  }
  factory() {
    return 0;
  }
  fromJson(json, target) {
    if (json !== null) {
      if (typeof json === "number" || typeof json === "string") {
        return Number(json);
      }
    }
    return this.isPtr ? null : this.factory();
  }
  toJson(v) {
    return v;
  }
  zero() {
    return this.isPtr ? null : 0;
  }
  typ() {
    return 0 /* TInt */;
  }
  length(v) {
    return LengthInt(v);
  }
  writeValue(buf, v) {
    WriterInt64(buf, v);
  }
  toBigInt(v) {
    return BigInt.asIntN(this.bits, BigInt(v));
  }
  fromBigInt(v) {
    return Number(BigInt.asIntN(this.bits, v));
  }
};
var SignedLong = class extends IntBase {
  factory() {
    return 0n;
  }
  fromJson(json, target) {
    if (json !== null) {
      if (typeof json === "number" || typeof json === "string") {
        return BigInt(json);
      }
    }
    return this.isPtr ? null : this.factory();
  }
  toJson(v) {
    return v == null ? null : v.toString();
  }
  constructor(isPtr) {
    super(isPtr);
  }
  zero() {
    return this.isPtr ? null : 0n;
  }
  typ() {
    return 0 /* TInt */;
  }
  length(v) {
    return LengthInt(v);
  }
  writeValue(buf, v) {
    WriterInt64(buf, v);
  }
  toBigInt(v) {
    return typeof v === "bigint" ? v : BigInt(v);
  }
  fromBigInt(v) {
    return BigInt.asIntN(64, v);
  }
};
var UnsignedInt = class extends IntBase {
  constructor(isPtr, bits) {
    super(isPtr);
    this.bits = bits;
  }
  factory() {
    return 0;
  }
  fromJson(json, target) {
    if (json !== null) {
      if (typeof json === "number" || typeof json === "string") {
        return Number(json);
      }
    }
    return this.isPtr ? null : this.factory();
  }
  toJson(v) {
    return v;
  }
  zero() {
    return this.isPtr ? null : 0;
  }
  typ() {
    return 1 /* TUint */;
  }
  length(v) {
    return LengthUint(v);
  }
  writeValue(buf, v) {
    EncodeUint64(buf, v);
  }
  toBigInt(v) {
    return BigInt.asUintN(this.bits, BigInt(v));
  }
  fromBigInt(v) {
    return Number(BigInt.asUintN(this.bits, v));
  }
};
var UnsignedLong = class extends IntBase {
  factory() {
    return 0n;
  }
  fromJson(json, target) {
    if (json !== null) {
      if (typeof json === "number" || typeof json === "string") {
        return BigInt(json);
      }
    }
    return this.isPtr ? null : this.factory();
  }
  toJson(v) {
    return v == null ? null : v.toString();
  }
  constructor(isPtr) {
    super(isPtr);
  }
  zero() {
    return this.isPtr ? null : 0n;
  }
  typ() {
    return 1 /* TUint */;
  }
  length(v) {
    return LengthUint(v);
  }
  writeValue(buf, v) {
    EncodeUint64(buf, v);
  }
  toBigInt(v) {
    return typeof v === "bigint" ? v : BigInt(v);
  }
  fromBigInt(v) {
    return BigInt.asUintN(64, v);
  }
};
var Uint8Impl = class extends UnsignedInt {
  constructor(isPtr) {
    super(isPtr, 8);
  }
  emptyIdLen() {
    return 2;
  }
  isEmptyField(v) {
    return v == null || v === 0;
  }
};
var Int8Descriptor = class extends SignedInt {
  constructor(isPtr = false) {
    super(isPtr, 8);
  }
};
var Int16Descriptor = class extends SignedInt {
  constructor(isPtr = false) {
    super(isPtr, 16);
  }
};
var Int32Descriptor = class extends SignedInt {
  constructor(isPtr = false) {
    super(isPtr, 32);
  }
};
var Int64Descriptor = class extends SignedLong {
  constructor(isPtr = false) {
    super(isPtr);
  }
};
var Uint8Descriptor = class extends Uint8Impl {
  constructor(isPtr = false) {
    super(isPtr);
  }
};
var Uint16Descriptor = class extends UnsignedInt {
  constructor(isPtr = false) {
    super(isPtr, 16);
  }
};
var Uint32Descriptor = class extends UnsignedInt {
  constructor(isPtr = false) {
    super(isPtr, 32);
  }
};
var Uint64Descriptor = class extends UnsignedLong {
  constructor(isPtr = false) {
    super(isPtr);
  }
};
var FloatBase = class {
  constructor(isPtr = false, isDouble) {
    this.isPtr = isPtr;
    this.isDouble = isDouble;
  }
  clone(val, target) {
    return val;
  }
  factory() {
    return 0;
  }
  fromJson(json, target) {
    if (json !== null) {
      if (typeof json === "number" || typeof json === "string") {
        return Number(json);
      }
    }
    return this.isPtr ? null : this.factory();
  }
  toJson(v) {
    return v == null ? null : this.isDouble ? v : Math.fround(v);
  }
  isEmptyField(v) {
    if (v == null) {
      return true;
    }
    return !this.isPtr && v === 0;
  }
  isEmpty(v) {
    return this.isEmptyField(v);
  }
  encode(buf, v, id) {
    if (id !== void 0) {
      if (this.isEmptyField(v)) {
        return;
      }
      const val = this.toBits(v);
      WriterType(buf, 2 /* TFloat */, LengthId(id), LengthUint(val));
      WriterId(buf, id);
      EncodeUint64(buf, val);
    } else {
      if (v == null) {
        WriterType(buf, 2 /* TFloat */, 0, 1);
        return;
      }
      const val = this.toBits(v);
      if (val === 0n) {
        WriterType(buf, 2 /* TFloat */, 0, 1);
        return;
      }
      WriterType(buf, 2 /* TFloat */, 1, LengthUint(val));
      EncodeUint64(buf, val);
    }
  }
  decode(r, typ, valRead, valueLen, target) {
    let val;
    switch (typ) {
      case 3 /* TBool */:
        val = valueLen === 2 ? 1 : 0;
        break;
      case 0 /* TInt */:
        val = valRead ? Number(DecodeInt64(r, valueLen)) : 0;
        break;
      case 1 /* TUint */:
        val = valRead ? Number(DecodeUint64(r, valueLen)) : 0;
        break;
      case 2 /* TFloat */: {
        if (!valRead) {
          val = 0;
          break;
        }
        const bits = DecodeUint64(r, valueLen);
        val = valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits);
        break;
      }
      case 4 /* TBytes */: {
        if (!valRead) {
          val = 0;
          break;
        }
        const size = DecodeUint64(r, valueLen);
        val = Number(utf8Decode(r.readBytes(Number(size))));
        break;
      }
      default:
        throw new HBufError("invalid float type");
    }
    return this.isDouble ? val : Math.fround(val);
  }
};
var FloatDescriptor = class extends FloatBase {
  constructor(isPtr = false) {
    super(isPtr, false);
  }
  zero() {
    return this.isPtr ? null : 0;
  }
  toBits(v) {
    return Float32Bits(Math.fround(v));
  }
};
var DoubleDescriptor = class extends FloatBase {
  constructor(isPtr = false) {
    super(isPtr, true);
  }
  zero() {
    return this.isPtr ? null : 0;
  }
  toBits(v) {
    return Float64Bits(v);
  }
};
var BoolDescriptor = class {
  constructor(isPtr = false) {
    this.isPtr = isPtr;
  }
  clone(val, target) {
    return val;
  }
  factory() {
    return false;
  }
  fromJson(json, target) {
    if (json !== null) {
      if (typeof json === "boolean" || typeof json === "string") {
        return Boolean(json);
      }
    }
    return this.isPtr ? null : this.factory();
  }
  toJson(v) {
    return v;
  }
  zero() {
    return this.isPtr ? null : false;
  }
  isEmpty(v) {
    if (v == null) {
      return true;
    }
    return !this.isPtr && v === false;
  }
  encode(buf, v, id) {
    if (id !== void 0) {
      if (v == null || !this.isPtr && v === false) {
        return;
      }
      WriterType(buf, 3 /* TBool */, LengthId(id), v ? 2 : 1);
      WriterId(buf, id);
    } else {
      if (v == null) {
        WriterType(buf, 3 /* TBool */, 0, 1);
        return;
      }
      WriterType(buf, 3 /* TBool */, 1, v ? 2 : 1);
    }
  }
  decode(r, typ, valRead, valueLen, target) {
    let val;
    switch (typ) {
      case 3 /* TBool */:
        val = valueLen === 2;
        break;
      case 0 /* TInt */:
        val = valRead && DecodeInt64(r, valueLen) !== 0n;
        break;
      case 1 /* TUint */:
        val = valRead && DecodeUint64(r, valueLen) !== 0n;
        break;
      case 2 /* TFloat */: {
        if (!valRead) {
          val = false;
          break;
        }
        const bits = DecodeUint64(r, valueLen);
        val = valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) !== 0 : Float64FromBits(bits) !== 0;
        break;
      }
      case 4 /* TBytes */: {
        if (!valRead) {
          val = false;
          break;
        }
        const size = DecodeUint64(r, valueLen);
        val = "true" === utf8Decode(r.readBytes(Number(size))).toLowerCase();
        break;
      }
      default:
        throw new HBufError("invalid bool type");
    }
    return val;
  }
};
var StringDescriptor = class {
  constructor(isPtr = false) {
    this.isPtr = isPtr;
  }
  clone(val, target) {
    return val;
  }
  factory() {
    return "";
  }
  fromJson(json, target) {
    if (json !== null) {
      if (typeof json === "string" || typeof json === "number" || typeof json === "boolean") {
        return String(json);
      }
    }
    return this.isPtr ? null : this.factory();
  }
  toJson(v) {
    return v;
  }
  zero() {
    return this.isPtr ? null : "";
  }
  isEmpty(v) {
    if (v == null) {
      return true;
    }
    return !this.isPtr && v.length === 0;
  }
  encode(buf, v, id) {
    if (id !== void 0) {
      if (this.isEmpty(v)) {
        return;
      }
      const val = utf8Encode(v);
      WriterType(buf, 4 /* TBytes */, LengthId(id), LengthUint(BigInt(val.length)));
      WriterId(buf, id);
      EncodeUint64(buf, BigInt(val.length));
      buf.writeBytes(val);
    } else {
      if (v == null) {
        WriterType(buf, 4 /* TBytes */, 0, 1);
        return;
      }
      const val = utf8Encode(v);
      if (val.length === 0) {
        WriterType(buf, 4 /* TBytes */, 0, 1);
        return;
      }
      WriterType(buf, 4 /* TBytes */, 1, LengthUint(BigInt(val.length)));
      EncodeUint64(buf, BigInt(val.length));
      buf.writeBytes(val);
    }
  }
  decode(r, typ, valRead, valueLen, target) {
    let val;
    switch (typ) {
      case 3 /* TBool */:
        val = valueLen === 2 ? "true" : "false";
        break;
      case 0 /* TInt */:
        val = valRead ? DecodeInt64(r, valueLen).toString() : "";
        break;
      case 1 /* TUint */:
        val = valRead ? DecodeUint64(r, valueLen).toString() : "";
        break;
      case 2 /* TFloat */: {
        if (!valRead) {
          val = "";
          break;
        }
        const bits = DecodeUint64(r, valueLen);
        val = (valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)).toString();
        break;
      }
      case 4 /* TBytes */: {
        if (!valRead) {
          val = "";
          break;
        }
        const size = DecodeUint64(r, valueLen);
        val = utf8Decode(r.readBytes(Number(size)));
        break;
      }
      default:
        throw new HBufError("invalid string type");
    }
    return val;
  }
};
var BytesDescriptor = class {
  constructor(isPtr = false) {
    this.isPtr = isPtr;
  }
  clone(val, target) {
    return val;
  }
  factory() {
    return new ArrayBuffer(0);
  }
  fromJson(json, target) {
    return json;
  }
  toJson(v) {
    return v;
  }
  zero() {
    return null;
  }
  isEmpty(v) {
    if (v == null) {
      return true;
    }
    return !this.isPtr && v.length === 0;
  }
  encode(buf, v, id) {
    if (id !== void 0) {
      if (this.isEmpty(v)) {
        return;
      }
      WriterType(buf, 4 /* TBytes */, LengthId(id), LengthUint(BigInt(v.length)));
      WriterId(buf, id);
      EncodeUint64(buf, BigInt(v.length));
      buf.writeBytes(v);
    } else {
      if (v == null) {
        WriterType(buf, 4 /* TBytes */, 0, 1);
        return;
      }
      if (v.length === 0) {
        WriterType(buf, 4 /* TBytes */, 0, 1);
        return;
      }
      WriterType(buf, 4 /* TBytes */, 1, LengthUint(BigInt(v.length)));
      EncodeUint64(buf, BigInt(v.length));
      buf.writeBytes(v);
    }
  }
  decode(r, typ, valRead, valueLen, target) {
    let val;
    switch (typ) {
      case 3 /* TBool */:
        val = utf8Encode(valueLen === 2 ? "true" : "false");
        break;
      case 0 /* TInt */:
        val = valRead ? utf8Encode(DecodeInt64(r, valueLen).toString()) : new Uint8Array(0);
        break;
      case 1 /* TUint */:
        val = valRead ? utf8Encode(DecodeUint64(r, valueLen).toString()) : new Uint8Array(0);
        break;
      case 2 /* TFloat */: {
        if (!valRead) {
          val = new Uint8Array(0);
          break;
        }
        const bits = DecodeUint64(r, valueLen);
        val = utf8Encode((valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)).toString());
        break;
      }
      case 4 /* TBytes */: {
        if (!valRead) {
          val = new Uint8Array(0);
          break;
        }
        const size = DecodeUint64(r, valueLen);
        val = r.readBytes(Number(size));
        break;
      }
      default:
        throw new HBufError("invalid bytes type");
    }
    return val;
  }
};
var TimeDescriptor = class {
  constructor(isPtr = false) {
    this.isPtr = isPtr;
  }
  clone(val, target) {
    return val;
  }
  factory() {
    return /* @__PURE__ */ new Date(0);
  }
  fromJson(json, target) {
    if (json != null) {
      if (typeof json === "number" || typeof json === "string") {
        return new Date(Number(json));
      }
    }
    return null;
  }
  toJson(v) {
    return v == null ? null : String(v.getTime());
  }
  zero() {
    return null;
  }
  isEmpty(v) {
    return v == null;
  }
  encode(buf, v, id) {
    if (id !== void 0) {
      if (v == null) {
        return;
      }
      WriterType(buf, 4 /* TBytes */, LengthId(id), 1);
      WriterId(buf, id);
      EncodeUint64(buf, 9n);
      const { secs, nsec } = DateToTime(v);
      EncodeTime(buf, secs, nsec);
    } else {
      if (v == null) {
        WriterType(buf, 4 /* TBytes */, 0, 1);
        return;
      }
      WriterType(buf, 4 /* TBytes */, 1, 1);
      EncodeUint64(buf, 9n);
      const { secs, nsec } = DateToTime(v);
      EncodeTime(buf, secs, nsec);
    }
  }
  decode(r, typ, valRead, valueLen, target) {
    if (typ !== 4 /* TBytes */) {
      throw new HBufError("invalid time type");
    }
    if (!valRead) {
      return null;
    }
    const size = DecodeUint64(r, valueLen);
    if (size !== 9n) {
      throw new HBufError("invalid time type");
    }
    const { secs, nsec } = DecodeTime(r);
    return TimeToDate(secs, nsec);
  }
};
function DecimalToStr(v) {
  if (v instanceof Decimal) {
    return v.toFixed(Math.max(0, v.decimalPlaces()));
  }
  return String(v);
}
var DecimalDescriptor = class {
  constructor(isPtr = false) {
    this.isPtr = isPtr;
  }
  clone(val, target) {
    return val;
  }
  factory() {
    return new Decimal(0);
  }
  fromJson(json, target) {
    if (json != null) {
      if (typeof json === "string" || typeof json === "number") {
        return new Decimal(json);
      }
    }
    return this.isPtr ? null : this.factory();
  }
  toJson(v) {
    return v == null ? null : DecimalToStr(v);
  }
  zero() {
    return this.isPtr ? null : new Decimal(0);
  }
  isEmpty(v) {
    if (v == null) {
      return true;
    }
    return !this.isPtr && Number(v) === 0;
  }
  encode(buf, v, id) {
    if (id !== void 0) {
      if (this.isEmpty(v)) {
        return;
      }
      const val = utf8Encode(DecimalToStr(v));
      WriterType(buf, 4 /* TBytes */, LengthId(id), LengthUint(BigInt(val.length)));
      WriterId(buf, id);
      EncodeUint64(buf, BigInt(val.length));
      buf.writeBytes(val);
    } else {
      if (v == null) {
        WriterType(buf, 4 /* TBytes */, 0, 1);
        return;
      }
      const val = utf8Encode(DecimalToStr(v));
      if (Number(v) === 0 || val.length === 0) {
        WriterType(buf, 4 /* TBytes */, 0, 1);
        return;
      }
      WriterType(buf, 4 /* TBytes */, 1, LengthUint(BigInt(val.length)));
      EncodeUint64(buf, BigInt(val.length));
      buf.writeBytes(val);
    }
  }
  decode(r, typ, valRead, valueLen, target) {
    let val;
    switch (typ) {
      case 3 /* TBool */:
        val = valueLen === 2 ? new Decimal(1) : new Decimal(0);
        break;
      case 0 /* TInt */:
        val = new Decimal(valRead ? DecodeInt64(r, valueLen).toString() : "0");
        break;
      case 1 /* TUint */:
        val = new Decimal(valRead ? DecodeUint64(r, valueLen).toString() : "0");
        break;
      case 2 /* TFloat */: {
        if (!valRead) {
          val = new Decimal(0);
          break;
        }
        const bits = DecodeUint64(r, valueLen);
        val = new Decimal((valueLen <= 4 ? Float32FromBits(bits & 0xFFFFFFFFn) : Float64FromBits(bits)).toString());
        break;
      }
      case 4 /* TBytes */: {
        if (!valRead) {
          val = new Decimal(0);
          break;
        }
        const size = DecodeUint64(r, valueLen);
        val = new Decimal(utf8Decode(r.readBytes(Number(size))));
        break;
      }
      default:
        throw new HBufError("invalid decimal type");
    }
    return val;
  }
};
var ListDescriptor = class {
  constructor(desc, isPtr = false) {
    this.desc = desc;
    this.isPtr = isPtr;
  }
  clone(v, target) {
    if (v == null) {
      return null;
    }
    const list = [];
    for (const item of v) {
      list.push(this.desc.clone(item));
    }
    return list;
  }
  factory() {
    return [];
  }
  fromJson(json, target) {
    if (Array.isArray(json)) {
      const list = [];
      for (const item of json) {
        list.push(this.desc.fromJson(item));
      }
      return list;
    }
    return this.isPtr ? null : this.factory();
  }
  toJson(v) {
    if (v == null) {
      return null;
    }
    const list = [];
    for (const item of v) {
      list.push(this.desc.toJson(item));
    }
    return list;
  }
  zero() {
    return null;
  }
  isEmpty(v) {
    if (v == null) {
      return true;
    }
    return !this.isPtr && v.length === 0;
  }
  encode(buf, v, id) {
    if (id !== void 0) {
      if (this.isEmpty(v)) {
        return;
      }
      WriterType(buf, 5 /* TList */, LengthId(id), LengthUint(BigInt(v.length)));
      WriterId(buf, id);
      EncodeUint64(buf, BigInt(v.length));
    } else {
      if (v == null) {
        WriterType(buf, 5 /* TList */, 0, 1);
        return;
      }
      if (v.length === 0) {
        WriterType(buf, 5 /* TList */, 0, 1);
        return;
      }
      WriterType(buf, 5 /* TList */, 1, LengthUint(BigInt(v.length)));
      EncodeUint64(buf, BigInt(v.length));
    }
    for (const item of v) {
      this.desc.encode(buf, item, void 0);
    }
  }
  decode(r, typ, valRead, valueLen, target) {
    if (typ !== 5 /* TList */) {
      throw new HBufError("invalid list type");
    }
    if (!valRead) {
      return void 0;
    }
    const count = DecodeUint64(r, valueLen);
    if (count === 0n) {
      return void 0;
    }
    const list = [];
    for (let i = 0n; i < count; i++) {
      const { typ: t, idLen, valueLen: vLen } = DecodeType(r);
      if (idLen > 0) {
        list.push(this.desc.decode(r, t, idLen === 1, vLen) ?? null);
      } else {
        list.push(this.desc.zero());
      }
    }
    return list;
  }
};
var MapDescriptor = class {
  constructor(keyDesc, valueDesc, isPtr = false) {
    this.keyDesc = keyDesc;
    this.valueDesc = valueDesc;
    this.isPtr = isPtr;
  }
  clone(val, target) {
    if (val == null) {
      return null;
    }
    const map = /* @__PURE__ */ new Map();
    for (const [k, v] of val) {
      map.set(this.keyDesc.clone(k), this.valueDesc.clone(v));
    }
    return map;
  }
  factory() {
    return /* @__PURE__ */ new Map();
  }
  fromJson(json, target) {
    if (json != null) {
      const _json = json;
      const map = /* @__PURE__ */ new Map();
      for (const [k, v] of Object.entries(_json)) {
        map.set(this.keyDesc.fromJson(k), this.valueDesc.fromJson(v));
      }
      return map;
    }
    return this.isPtr ? null : this.factory();
  }
  toJson(val) {
    if (val == null) {
      return null;
    }
    const map = {};
    for (const [k, v] of val) {
      map[String(this.keyDesc.toJson(k))] = this.valueDesc.toJson(v);
    }
    return map;
  }
  zero() {
    return null;
  }
  isEmpty(v) {
    if (v == null) {
      return true;
    }
    return !this.isPtr && v.size === 0;
  }
  encode(buf, v, id) {
    if (id !== void 0) {
      if (this.isEmpty(v)) {
        return;
      }
      WriterType(buf, 6 /* TMap */, LengthId(id), LengthUint(BigInt(v.size)));
      WriterId(buf, id);
      EncodeUint64(buf, BigInt(v.size));
    } else {
      if (v == null) {
        WriterType(buf, 6 /* TMap */, 0, 1);
        return;
      }
      if (v.size === 0) {
        WriterType(buf, 6 /* TMap */, 0, 1);
        return;
      }
      WriterType(buf, 6 /* TMap */, 1, LengthUint(BigInt(v.size)));
      EncodeUint64(buf, BigInt(v.size));
    }
    for (const [k, val] of v) {
      this.keyDesc.encode(buf, k, void 0);
      this.valueDesc.encode(buf, val, void 0);
    }
  }
  decode(r, typ, valRead, valueLen, target) {
    if (typ !== 6 /* TMap */) {
      throw new HBufError("invalid map type");
    }
    if (!valRead) {
      return void 0;
    }
    const count = DecodeUint64(r, valueLen);
    if (count === 0n) {
      return void 0;
    }
    const m = /* @__PURE__ */ new Map();
    for (let i = 0n; i < count; i++) {
      let { typ: t, idLen, valueLen: vLen } = DecodeType(r);
      const k = idLen > 0 ? this.keyDesc.decode(r, t, idLen === 1, vLen) ?? null : this.keyDesc.zero();
      ({ typ: t, idLen, valueLen: vLen } = DecodeType(r));
      const val = idLen > 0 ? this.valueDesc.decode(r, t, idLen === 1, vLen) ?? null : this.valueDesc.zero();
      m.set(k, val);
    }
    return m;
  }
};
var DataDescriptor = class {
  constructor(factory, fields, extends_ = /* @__PURE__ */ new Map(), isPtr = false) {
    this.factory = factory;
    this.isPtr = isPtr;
    this.fields = Array.from(fields, ([id, f]) => ({ ...f, id })).sort((a, b) => a.id - b.id);
    this.fieldMap = fields;
    this.extends_ = Array.from(extends_, ([id, f]) => ({ ...f, id })).sort((a, b) => a.id - b.id);
    this.extendMap = extends_;
  }
  clone(val, target) {
    if (val == null) {
      return null;
    }
    const ret = target ?? this.factory();
    for (const field of this.fields) {
      field.set(ret, field.desc.clone(field.get(val)));
    }
    for (const f of this.extends_) {
      f.set(ret, f.desc.clone(f.get(val), ret));
    }
    return ret;
  }
  fromJson(json, target) {
    if (json != null) {
      const ret = target ?? this.factory();
      const _json = json;
      for (const field of this.fields) {
        if (field.name) {
          field.set(ret, field.desc.fromJson(_json[field.name]));
        }
      }
      for (const f of this.extends_) {
        f.desc.fromJson(_json, ret);
      }
      return ret;
    }
    return this.isPtr ? null : this.factory();
  }
  toJson(v) {
    if (v == null) {
      return null;
    }
    let ret = {};
    for (const [_, field] of this.extendMap) {
      ret = { ...ret, ...field.desc.toJson(field.get(v)) };
    }
    for (const field of this.fields) {
      if (field.name) {
        ret[field.name] = field.desc.toJson(field.get(v));
      }
    }
    return ret;
  }
  zero() {
    return null;
  }
  isEmpty(v) {
    return v == null;
  }
  encode(buf, v, id) {
    if (id !== void 0) {
      if (v == null) {
        return;
      }
      let count = 0;
      for (const f of this.fields) {
        if (!f.desc.isEmpty(f.get(v))) {
          count++;
        }
      }
      WriterType(buf, 7 /* TData */, LengthId(id), LengthUint(BigInt(count)));
      WriterId(buf, id);
      EncodeUint64(buf, BigInt(count));
    } else {
      if (v == null) {
        if (this.isPtr) {
          WriterType(buf, 7 /* TData */, 0, 1);
        } else {
          WriterType(buf, 7 /* TData */, 1, 1);
          EncodeUint64(buf, 0n);
          WriterType(buf, 0 /* TInt */, 0, 1);
        }
        return;
      }
      let count = 0;
      for (const f of this.fields) {
        if (!f.desc.isEmpty(f.get(v))) {
          count++;
        }
      }
      WriterType(buf, 7 /* TData */, 1, LengthUint(BigInt(count)));
      EncodeUint64(buf, BigInt(count));
    }
    for (const f of this.fields) {
      const val = f.get(v);
      if (!f.desc.isEmpty(val)) {
        f.desc.encode(buf, val, f.id);
      }
    }
    if (this.extends_.length === 0) {
      WriterType(buf, 0 /* TInt */, 0, 1);
    } else {
      WriterType(buf, 0 /* TInt */, 1, LengthUint(BigInt(this.extends_.length)));
      EncodeUint64(buf, BigInt(this.extends_.length));
      for (const f of this.extends_) {
        const val = f.get(v);
        if (!f.desc.isEmpty(val)) {
          f.desc.encode(buf, val, f.id);
        }
      }
    }
  }
  decode(r, typ, valRead, valueLen, target) {
    if (typ !== 7 /* TData */) {
      throw new HBufError("invalid data type");
    }
    const v = this.isPtr ? this.factory() : target ?? this.factory();
    const count = valRead ? DecodeUint64(r, valueLen) : 0n;
    for (let i = 0n; i < count; i++) {
      const { typ: t, idLen: idLen2, valueLen: vLen } = DecodeType(r);
      const id = DecodeId(r, idLen2);
      const field = this.fieldMap.get(id);
      if (field) {
        const cur = field.get(v);
        const dv = field.desc.decode(r, t, true, vLen, cur);
        if (dv !== void 0) {
          field.set(v, dv);
        }
      } else {
        SkipValue(r, t, vLen);
      }
    }
    const { idLen, valueLen: eValLen } = DecodeType(r);
    if (idLen > 0) {
      const extCount = DecodeUint64(r, eValLen);
      for (let i = 0n; i < extCount; i++) {
        const { typ: t, idLen: eIdLen, valueLen: eVLen } = DecodeType(r);
        const id = DecodeId(r, eIdLen);
        const field = this.extendMap.get(id);
        if (field) {
          const cur = field.get(v);
          const dv = field.desc.decode(r, t, true, eVLen, cur);
          if (dv !== void 0) {
            field.set(v, dv);
          }
        } else {
          SkipValue(r, t, eVLen);
        }
      }
    }
    if (count === 0n && !this.isPtr && target !== void 0) {
      return void 0;
    }
    return v;
  }
};
var RefDescriptor = class {
  constructor(getDesc, isPtr = false) {
    this.isPtr = isPtr;
    this.cache = null;
    this.getDesc = null;
    this.getDesc = getDesc;
  }
  clone(val, target) {
    return this.desc.clone(val, target);
  }
  get desc() {
    if (this.cache === null) {
      this.cache = this.getDesc();
    }
    return this.cache;
  }
  factory() {
    return this.desc.factory();
  }
  toJson(v) {
    if (v == null) {
      return null;
    }
    return this.desc.toJson(v);
  }
  fromJson(json, target) {
    if (json == null && this.isPtr) {
      return null;
    }
    return this.desc.fromJson(json, target);
  }
  zero() {
    return null;
  }
  isEmpty(v) {
    return v == null;
  }
  encode(buf, v, id) {
    if (id !== void 0) {
      if (v == null) {
        return;
      }
      this.desc.encode(buf, v, id);
    } else {
      if (v == null) {
        if (this.isPtr) {
          WriterType(buf, 7 /* TData */, 0, 1);
        } else {
          this.desc.encode(buf, null, void 0);
        }
        return;
      }
      this.desc.encode(buf, v, void 0);
    }
  }
  decode(r, typ, valRead, valueLen, target) {
    return this.desc.decode(r, typ, valRead, valueLen, this.isPtr ? void 0 : target);
  }
};

// src/hrpc/rpc.ts
var Error2 = class {
  constructor(code, msg) {
    this.code = code;
    this.msg = msg;
  }
  descriptors() {
    return errorDesc;
  }
};
var Result = class extends Error2 {
  constructor(code, msg, data, desc) {
    super(code, msg);
    this.data = data;
    this.desc = desc;
  }
  descriptors() {
    const dataDesc = this.desc ?? (isHData(this.data) ? this.data.descriptors() : void 0);
    return NewResultDesc(dataDesc);
  }
};
var errorDesc = new DataDescriptor(
  () => new Error2(0, ""),
  /* @__PURE__ */ new Map([
    [1, {
      name: "code",
      desc: new Int32Descriptor(),
      get: (o) => o.code,
      set: (o, v) => o.code = v
    }],
    [2, {
      name: "msg",
      desc: new StringDescriptor(),
      get: (o) => o.msg,
      set: (o, v) => o.msg = v
    }]
  ])
);
function NewResultDesc(dataDesc) {
  const fields = /* @__PURE__ */ new Map([
    [1, {
      name: "code",
      desc: new Int32Descriptor(),
      get: (o) => o.code,
      set: (o, v) => o.code = v
    }],
    [2, {
      name: "msg",
      desc: new StringDescriptor(),
      get: (o) => o.msg,
      set: (o, v) => o.msg = v
    }]
  ]);
  if (dataDesc) {
    fields.set(3, {
      name: "data",
      desc: new RefDescriptor(() => dataDesc, true),
      get: (o) => o.data,
      set: (o, v) => o.data = v
    });
  }
  return new DataDescriptor(
    () => new Result(0, ""),
    fields
  );
}
var JsonDescriptor = class {
  constructor(isPtr = false) {
    this.isPtr = isPtr;
  }
  clone(val, target) {
    return val;
  }
  factory() {
    return null;
  }
  fromJson(json) {
    if (json == null) {
      return this.isPtr ? null : void 0;
    }
    return json;
  }
  toJson(v) {
    return v == null ? null : v;
  }
  zero() {
    return null;
  }
  isEmpty(v) {
    return v == null;
  }
  encode(buf, v, id) {
    throw new HBufError("json descriptor: encode not supported");
  }
  decode(r, typ, valRead, valueLen, target) {
    throw new HBufError("json descriptor: decode not supported");
  }
};
function NewJsonDecoder() {
  const decoder = new TextDecoder("utf-8");
  return (buffer, desc) => {
    const str = decoder.decode(buffer);
    return desc.fromJson(JSON.parse(str));
  };
}
function NewJsonEncode() {
  const encoder = new TextEncoder();
  return (v) => {
    const str = JSON.stringify(v.descriptors().toJson(v));
    return encoder.encode(str).buffer;
  };
}
function NewHBufEncode() {
  return (v) => {
    return Marshal(v).slice().buffer;
  };
}
function NewHBufDecoder() {
  return (buffer, desc) => {
    const data = desc.factory();
    Unmarshal(new Uint8Array(buffer), data, desc);
    return data;
  };
}
var Client = class {
  constructor(request, option) {
    this.request = request;
    this.middleware = (next) => {
      for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
        next = option.middleware[i](next);
      }
      return next;
    };
  }
  invoke(id, name, method, request, desc) {
    name = name.replace(/^\/+|\/+$/g, "") + "/";
    return this.middleware(async (req, opt) => {
      const resp = await this.request(name + method, desc == null, req, desc, opt);
      if (desc) {
        if (resp.code !== 0) {
          throw resp;
        }
        return resp.data;
      }
      return resp;
    })(request, { method, headers: new Headers() });
  }
};
var Server = class {
  constructor(option) {
    this.decode = option?.decode ?? NewJsonDecoder();
    this.encode = option?.encode ?? NewJsonEncode();
    this.methods = {};
    this.middleware = (next) => {
      for (let i = (option?.middleware?.length ?? 0) - 1; i >= 0; i--) {
        next = option.middleware[i](next);
      }
      return next;
    };
  }
  register(id, name, methods) {
    name = "/" + name.replace(/^\/+|\/+$/g, "") + "/";
    for (const method of methods) {
      const key = method.name.replace(/|\/+$/g, "");
      this.methods[name + key] = method;
    }
  }
  unRegister(id, name) {
    name = "/" + name.replace(/^\/+|\/+$/g, "") + "/";
    for (const key in this.methods) {
      if (key.startsWith(name)) {
        delete this.methods[key];
      }
    }
  }
  async response(path, req) {
    path = "/" + path.replace(/^\/+|\/+$/g, "");
    const method = this.methods[path];
    if (!method) {
      throw new Error2(-1, "Method not found");
    }
    let val = req;
    if (method.desc) {
      if (req instanceof ArrayBuffer || req instanceof Uint8Array) {
        const buf = req instanceof ArrayBuffer ? req : req.buffer.slice(req.byteOffset, req.byteOffset + req.byteLength);
        val = this.decode(buf, method.desc);
      } else {
        val = method.desc.fromJson(req);
      }
    }
    return await this.middleware(method.handler)(val);
  }
};

// src/utils/tools.ts
async function waiting(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), Math.max(time, 0));
  });
}
function convertArray(list, call) {
  if (null == list) {
    return null;
  }
  let ret = new Array(list.length);
  for (const key in list) {
    ret[key] = call(list[key]);
  }
  return ret;
}
var RecordEntry = class {
  get val() {
    return this._val;
  }
  get key() {
    return this._key;
  }
  constructor(key, val) {
    this._key = key;
    this._val = val;
  }
};
function convertRecord(record, call) {
  if (null == record) {
    return null;
  }
  let ret = {};
  for (const key in record) {
    let val = call(key, record[key]);
    ret[val.key] = val.val;
  }
  return ret;
}
function isRecord(o) {
  return Object.getPrototypeOf({}) === Object.getPrototypeOf(o);
}
function isArray(o) {
  return Object.getPrototypeOf([]) === Object.getPrototypeOf(o);
}
function formatDate(date, format) {
  if (!format) format = "YYYY-MM-DD";
  switch (typeof date) {
    case "string":
      date = new Date(date.replace(/-/g, "/"));
      break;
    case "number":
      date = new Date(date);
      break;
  }
  if (date instanceof Date) {
    const dict = {
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
    return format.replace(/(YYYY|MM?|DD?|HH?|ss?|mm?|SS?)/g, function() {
      return dict[arguments[0]];
    });
  }
  return "" + date;
}
function isData(obj) {
  return obj && typeof obj.descriptors === "function";
}
var BASE62_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function traceId() {
  const milli = BigInt(Date.now());
  const randBuf = new Uint8Array(9);
  crypto.getRandomValues(randBuf);
  let random65 = 0n;
  for (let i = 0; i < 9; i++) {
    random65 = random65 << 8n | BigInt(randBuf[i]);
  }
  random65 = random65 & (1n << 65n) - 1n;
  let num = milli << 65n | random65;
  const result = new Array(18);
  const target = 62n;
  for (let i = 17; i >= 0; i--) {
    const rem = num % target;
    num = num / target;
    result[i] = BASE62_CHARS[Number(rem)];
  }
  return result.join("");
}

// src/hrpc/http.ts
var HttpClient = class {
  constructor(base, option) {
    this.base = base.replace(/^\/+|\/+$/g, "") + "/";
    this.decode = option?.decode ?? NewJsonDecoder();
    this.encode = option?.encode ?? NewJsonEncode();
  }
  async request(path, notification, req, desc, opt) {
    const body = isData(req) ? this.encode(req) : req;
    const resp = await this.fetch(path, body, opt);
    if (desc) {
      return this.decode(resp instanceof Blob ? await resp.arrayBuffer() : resp, NewResultDesc(desc));
    } else {
      return resp;
    }
  }
  async fetch(path, body, opt) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", this.base + path);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-Trace-Id", opt?.traceId ?? traceId());
    xhr.send(body);
    return new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(new Error(`HTTP Error: ${xhr.status} ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => {
        reject(new Error("Network Error"));
      };
    });
  }
};
var FetchClient = class {
  constructor(base, option) {
    this.base = base.replace(/^\/+|\/+$/g, "") + "/";
    this.decode = option?.decode ?? NewJsonDecoder();
    this.encode = option?.encode ?? NewJsonEncode();
  }
  async request(path, notification, req, desc, opt) {
    const body = isData(req) ? this.encode(req) : req;
    const resp = await this.fetch(path, body, opt);
    if (desc) {
      return this.decode(resp instanceof Blob ? await resp.arrayBuffer() : resp, NewResultDesc(desc));
    } else {
      return resp;
    }
  }
  async fetch(path, body, opt) {
    const headers = opt?.headers ?? new Headers();
    headers.append("X-Trace-Id", opt?.traceId ?? traceId());
    const res = await fetch(this.base + path, {
      method: "POST",
      body,
      headers
    });
    if (res.ok) {
      return res.arrayBuffer();
    } else {
      throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }
  }
  $getChangeField() {
    return [];
  }
};

// src/hrpc/websocket.ts
var WebSocketData = class {
  constructor(type, id, path, data) {
    this.type = type;
    this.id = id;
    this.path = path;
    this.data = data;
  }
  descriptors() {
    const dataDesc = isHData(this.data) ? this.data.descriptors() : jsonDesc;
    return webSocketDataDesc(dataDesc);
  }
};
var jsonDesc = new JsonDescriptor(true);
function webSocketDataDesc(dataDesc) {
  return new DataDescriptor(
    () => new WebSocketData(0 /* Request */),
    /* @__PURE__ */ new Map([
      [1, {
        name: "type",
        desc: new Uint8Descriptor(),
        get: (o) => o.type,
        set: (o, v) => o.type = v
      }],
      [2, {
        name: "header",
        desc: new MapDescriptor(new StringDescriptor(), new ListDescriptor(new StringDescriptor()), true),
        get: (o) => o.header,
        set: (o, v) => o.header = v
      }],
      [3, {
        name: "id",
        desc: new Int64Descriptor(true),
        get: (o) => o.id,
        set: (o, v) => o.id = v
      }],
      [4, {
        name: "path",
        desc: new StringDescriptor(true),
        get: (o) => o.path,
        set: (o, v) => o.path = v
      }],
      [5, {
        name: "status",
        desc: new Int32Descriptor(true),
        get: (o) => o.status,
        set: (o, v) => o.status = v
      }],
      [6, {
        name: "data",
        desc: new RefDescriptor(() => dataDesc, true),
        get: (o) => o.data,
        set: (o, v) => o.data = v
      }]
    ])
  );
}
var FetchPromise = class {
  constructor(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;
  }
};
var WebSocketClient = class {
  constructor(baseUrl, server, option) {
    this.requestId = 0n;
    this.requestMap = /* @__PURE__ */ new Map();
    this.readTimeout = 3e4;
    this.heartbeat = 3e4;
    this.interval = null;
    this.headTimeout = false;
    this.baseUrl = baseUrl;
    this.server = server;
    this.readTimeout = option?.readTimeout ?? 3e4;
    this.heartbeat = option?.heartbeat ?? 3e4;
    this.decode = option?.decode ?? NewJsonDecoder();
    this.encode = option?.encode ?? NewJsonEncode();
  }
  async request(path, notification, req, desc, opt) {
    this.requestId++;
    let data = new WebSocketData(
      notification ? 2 /* Notification */ : 0 /* Request */,
      this.requestId,
      path
    );
    if (opt?.headers) {
      const header = /* @__PURE__ */ new Map();
      opt.headers.forEach((value, key) => {
        header.set(key, (header.get(key) || []).concat(value));
      });
      data.header = header;
    }
    if (req instanceof Blob) {
      req = await req.arrayBuffer();
    }
    data.data = req;
    const body = this.encode(data);
    const promise = new Promise((resolve, reject) => {
      let timer;
      const p = new FetchPromise((value) => {
        if (this.requestMap.delete(data.id)) {
          clearTimeout(timer);
          resolve(value);
        }
      }, (e) => {
        if (this.requestMap.delete(data.id)) {
          clearTimeout(timer);
          reject(e);
        }
      });
      if (!notification) {
        timer = setTimeout(() => {
          if (this.requestMap.delete(data.id)) {
            reject("timeout");
          }
        }, this.readTimeout);
        this.requestMap.set(data.id, p);
      }
    });
    this.socket?.send(body);
    if (notification) {
      return;
    }
    data = await promise;
    if (desc) {
      return NewResultDesc(desc).fromJson(data.data);
    }
    return data.data;
  }
  connect(protocols) {
    let url = this.baseUrl;
    return new Promise((resolve, r) => {
      let reject = r;
      clearInterval(this.interval ?? 0);
      try {
        this.socket = new WebSocket(url, protocols);
        this.socket.onclose = (event) => {
          clearInterval(this.interval ?? 0);
          this.onclose?.call(this, event.reason);
        };
        this.socket.onerror = (event) => {
          reject?.call(this, event);
          reject = null;
        };
        this.socket.onmessage = async (event) => {
          try {
            let buffer = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
            await this.onMessage(buffer);
          } catch (e) {
            if (e != "Method not found") {
              console.log(e);
            }
          }
        };
        this.socket.onopen = (event) => {
          this.interval = setInterval(() => this.onHeartbeat(), this.heartbeat);
          resolve();
        };
      } catch (e) {
        reject?.call(this, e);
        reject = null;
      }
    });
  }
  close() {
    clearInterval(this.interval ?? 0);
    this.socket?.close();
  }
  async onMessage(buffer) {
    this.headTimeout = false;
    const response = this.decode(buffer, webSocketDataDesc(jsonDesc));
    if (response.type == 1 /* Response */) {
      if (response.status == 200) {
        this.requestMap.get(response.id)?.resolve(response);
      } else {
        this.requestMap.get(response.id)?.reject(`Error: ${response.status}`);
      }
    } else if (response.type == 3 /* Ping */) {
      const data = new WebSocketData(4 /* Pong */);
      this.socket?.send(this.encode(data));
    } else if (response.type == 0 /* Request */ || response.type == 2 /* Notification */) {
      await this.onRequest(response, response.type == 2 /* Notification */);
    }
  }
  async onRequest(request, broadcast) {
    if (broadcast) {
      this.server?.response(request.path, request.data);
      return;
    }
    let data = new WebSocketData(
      1 /* Response */,
      request.id,
      request.path
    );
    if (this.server) {
      let resp = await this.server?.response(request.path, request.data);
      if (resp instanceof Blob) {
        resp = await resp.arrayBuffer();
      }
      data.status = 200;
      data.data = resp instanceof ArrayBuffer ? resp : new Result(0, "ok", resp);
    } else {
      data.status = 404;
    }
    this.socket?.send(this.encode(data));
  }
  onHeartbeat() {
    if (this.socket?.OPEN) {
      if (this.headTimeout) {
        this.socket.close();
        clearInterval(this.interval ?? 0);
        this.onclose?.call(this, "timeout");
        return;
      }
      const data = new WebSocketData(3 /* Ping */);
      this.socket.send(this.encode(data));
      this.headTimeout = true;
    }
  }
};

// src/index.ts
var index_default = {
  Client,
  HttpClient,
  FetchClient,
  WebSocketClient,
  Server,
  Result,
  Error: Error2,
  NewJsonDecoder,
  NewJsonEncode,
  NewHBufDecoder,
  NewHBufEncode,
  WebSocketData,
  waiting,
  convertArray,
  RecordEntry,
  convertRecord,
  isRecord,
  isArray,
  formatDate,
  isData,
  Int8Descriptor,
  Int16Descriptor,
  Int32Descriptor,
  Int64Descriptor,
  Uint8Descriptor,
  Uint16Descriptor,
  Uint32Descriptor,
  Uint64Descriptor,
  FloatDescriptor,
  DoubleDescriptor,
  BoolDescriptor,
  StringDescriptor,
  BytesDescriptor,
  TimeDescriptor,
  DecimalDescriptor,
  ListDescriptor,
  MapDescriptor,
  DataDescriptor,
  RefDescriptor,
  traceId
};
export {
  BoolDescriptor,
  BytesDescriptor,
  Client,
  DataDescriptor,
  DecimalDescriptor,
  DoubleDescriptor,
  Error2 as Error,
  FetchClient,
  FloatDescriptor,
  HBufError,
  HttpClient,
  Int16Descriptor,
  Int32Descriptor,
  Int64Descriptor,
  Int8Descriptor,
  ListDescriptor,
  MapDescriptor,
  Marshal,
  NewHBufDecoder,
  NewHBufEncode,
  NewJsonDecoder,
  NewJsonEncode,
  Reader2 as Reader,
  RecordEntry,
  RefDescriptor,
  Result,
  Server,
  ShortBufferError,
  StringDescriptor,
  TimeDescriptor,
  Type,
  Uint16Descriptor,
  Uint32Descriptor,
  Uint64Descriptor,
  Uint8Descriptor,
  Unmarshal,
  WebSocketClient,
  WebSocketData,
  Writer,
  convertArray,
  convertRecord,
  index_default as default,
  formatDate,
  isArray,
  isData,
  isHData,
  isRecord,
  traceId,
  waiting
};
//# sourceMappingURL=index.js.map