import { FelicaReaderRcS300 as m } from "./FelicaReaderRcS300.js";
import { arrayToHex as l, hexStringToByteArray as w } from "./utils.js";
const d = {
  "RC-S300/S": {
    vendorId: 1356,
    productId: 3528,
    readerClass: m
  },
  "RC-S300/P": {
    vendorId: 1356,
    productId: 3529,
    readerClass: m
  }
};
class y {
  /**
   * コンストラクタ
   * @param felicaReader
   */
  constructor(e) {
    this.felicaReader = e;
  }
  /**
   * FeliCaリーダー機器への接続
   * @param readerFilter 接続を許可する機器の型番リスト
   * @param debugEnabled デバッグを有効にする
   * @returns
   */
  static async connectFelicaReader(e = [], t = !1) {
    let o;
    const r = Object.keys(
      d
    ), i = e && e.length > 0 ? r.filter((a) => e.includes(a)) : r, s = await navigator.usb.getDevices();
    if (s.length > 0)
      for (const a of s) {
        const f = i.find(
          (n) => a.vendorId === d[n].vendorId && a.productId === d[n].productId
        );
        if (f) {
          o = { usbDevice: a, modelName: f };
          break;
        }
      }
    if (!o) {
      let a;
      const f = e.map((n) => ({
        vendorId: d[n].vendorId,
        productId: d[n].productId
      }));
      try {
        a = await navigator.usb.requestDevice({
          filters: f
        });
      } catch (n) {
        if (n instanceof DOMException) return;
        throw n;
      }
      o = {
        usbDevice: a,
        modelName: i.find(
          (n) => a.vendorId === d[n].vendorId && a.productId === d[n].productId
        )
      };
    }
    const c = new d[o.modelName].readerClass(o.usbDevice, t);
    return new y(c);
  }
  /**
   * デバイスのオープン
   * @returns
   */
  async openDevice() {
    await this.felicaReader.open();
  }
  /**
   * デバイスのクローズ
   * @returns
   */
  async closeDevice() {
    await this.felicaReader.close();
  }
  /**
   * Felica のポーリング操作を実行し、IDm とシステムコードを返す。
   */
  async polling(e = 100) {
    const t = [0, 255, 255, 1, 0], o = await this.felicaOperation(
      t,
      e,
      "Polling"
    );
    if (o)
      return {
        idm: l(new Uint8Array(o.data.slice(0, 8)), !0),
        systemCode: l(new Uint8Array(o.data.slice(16, 18)), !0)
      };
  }
  /**
   * Felica の RequestService 操作。
   * @param idm Felica のIDm（16進数文字列）
   * @param nodeCodeList ノードコードの配列（各コードは数値）
   */
  async requestService(e, t) {
    const r = [2];
    if (t.length % 2 !== 0 || t.length < 2 || t.length > 64)
      throw new Error("ノードコードリストの桁数が不適切です");
    const i = t.length / 2, s = w(e), c = r.concat(s).concat([i]).concat(t), u = await this.felicaOperation(
      c,
      100,
      "RequestService"
    );
    if (u)
      return {
        idm: l(new Uint8Array(u.data.slice(0, 8)), !0),
        nodeCount: l(new Uint8Array(u.data.slice(8, 9))),
        nodeKeyVerList: l(new Uint8Array(u.data.slice(9)))
      };
  }
  /**
   * Felica の暗号化無しデータ読み取り操作。
   * @param idm Felica のIDm（16進数文字列）
   * @param params 各サービスに対するパラメータの配列
   */
  async readWithoutEncryption(e, t) {
    if (t.length === 0 || t.length > 16)
      throw new Error(
        "paramsが不正です。対象のサービスは1〜16個の範囲で指定してください"
      );
    const r = [6], i = w(e), s = [t.length], { totalBlockCount: c, blockList: u, serviceCodeList: a } = t.reduce(
      (v, h) => {
        if (h.serviceCode.length !== 4)
          throw new Error(
            `サービスコードリストの桁数が不適切です:${h.serviceCode}`
          );
        return v.serviceCodeList.push(...w(h.serviceCode)), v.blockList.push(...this.constructBlockList(h.blockListParam, 0)), v.totalBlockCount += h.blockListParam.blockNoEnd - h.blockListParam.blockNoStart + 1, v;
      },
      {
        totalBlockCount: 0,
        blockList: [],
        serviceCodeList: []
      }
    ), f = r.concat(i).concat(s).concat(a).concat([c]).concat(u), n = await this.felicaOperation(
      f,
      100,
      "ReadWithoutEncryption"
    );
    if (n)
      return {
        idm: l(new Uint8Array(n.data.slice(0, 8)), !0),
        statusFlag1: l(new Uint8Array(n.data.slice(8, 9))),
        statusFlag2: l(new Uint8Array(n.data.slice(9, 10))),
        blockSize: l(new Uint8Array(n.data.slice(10, 11))),
        blockData: l(new Uint8Array(n.data.slice(11)), !0)
      };
  }
  /**
   * Felica コマンドをラップし、送受信、レスポンスの解析までを行う。
   */
  async felicaOperation(e, t, o) {
    const r = this.constructFelicaRequest(e, t);
    return await this.felicaReader.operateFelica(
      r,
      o
    );
  }
  constructFelicaRequest(e, t) {
    const o = [95, 70, 4], r = [149, 130], i = t * 1e3, s = e.length + 1, c = [...o];
    return c.push(
      i & 255,
      i >> 8 & 255,
      i >> 16 & 255,
      i >> 24 & 255
    ), c.push(...r), c.push(
      s >> 8 & 255,
      s & 255
    ), c.push(s), c.push(...e), c;
  }
  /**
   * ブロックリストを構成する。
   * @param param ブロック範囲とアクセスモード
   * @param serviceListOrder サービスリスト内の順序
   */
  constructBlockList(e, t) {
    if (e.blockNoEnd > 65535) throw new Error("blockCountが不正です");
    if (t > 255) throw new Error("serviceListOrderが不正です");
    const o = e.blockNoEnd > 255 ? 3 : 2;
    let r = 0;
    o === 2 && (r += 128), e.accessMode === "purse-cashback" && (r += 16), r += t;
    const i = [];
    for (let s = e.blockNoStart; s <= e.blockNoEnd; s++) {
      const c = new Uint8Array(o);
      c[0] = r, c[1] = s & 255, o === 3 && (c[2] = s >> 8 & 255), i.push(...c);
    }
    return i;
  }
}
export {
  y as FelicaService,
  d as felicaReaderModels
};
