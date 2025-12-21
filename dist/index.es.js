class l {
}
class h {
  constructor(r, e) {
    this.headers = e, this.method = r;
  }
}
function f() {
  const d = new TextDecoder("utf-8");
  return (r, e) => {
    const t = d.decode(r);
    return JSON.parse(t);
  };
}
function w() {
  const d = new TextEncoder();
  return (r, e) => {
    const t = JSON.stringify(r);
    return d.encode(t).buffer;
  };
}
class g {
  constructor(r, e) {
    this.request = r, this.decode = e?.decode ?? f(), this.encode = e?.encode ?? w(), this.middleware = (t) => {
      for (let s = (e?.middleware?.length ?? 0) - 1; s >= 0; s--)
        t = e.middleware[s](t);
      return t;
    };
  }
  Invoke(r, e, t, s, c, i) {
    return e = e.replace(/^\/+|\/+$/g, "") + "/", this.middleware(async (a, n) => {
      const u = await this.request(e + t, !1, () => a instanceof l ? this.encode(a, s.length > 0 ? "I" + s : "") : a, n);
      if (i == "data") {
        const o = this.decode(u, "");
        if (o.code != 0)
          throw o;
        return o.data;
      } else
        return u;
    })(c, new h(t, new Headers()));
  }
}
class m {
  constructor(r, e) {
    this.base = r.replace(/^\/+|\/+$/g, "") + "/", this.middleware = (t) => {
      for (let s = (e?.middleware?.length ?? 0) - 1; s >= 0; s--)
        t = e.middleware[s](t);
      return t;
    };
  }
  request(r, e, t, s) {
    return this.middleware(async (c, i, a) => {
      const n = await fetch(this.base + c, {
        method: "POST",
        body: a(),
        headers: s?.headers
      });
      if (n.ok)
        return n.arrayBuffer();
      throw new Error(`HTTP Error: ${n.status} ${n.statusText}`);
    })(r, e, t);
  }
}
const T = {
  Client: g,
  HttpClient: m
};
export {
  T as default
};
