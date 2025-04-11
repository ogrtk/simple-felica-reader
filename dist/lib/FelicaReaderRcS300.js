var m = Object.defineProperty;
var w = (o, t, e) => t in o ? m(o, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : o[t] = e;
var u = (o, t, e) => w(o, typeof t != "symbol" ? t + "" : t, e);
import { sleep as c, arrayToHex as p, binArrayToHex as l, dataViewToUint8Array as b } from "./utils.js";
class U {
  constructor(t, e = !1) {
    u(this, "seq", 0);
    // RC-S300 のコマンド定義
    u(this, "commands", {
      startTransparent: [255, 80, 0, 0, 2, 129, 0, 0],
      turnOn: [255, 80, 0, 0, 2, 132, 0, 0],
      endTransparent: [255, 80, 0, 0, 2, 130, 0, 0],
      turnOff: [255, 80, 0, 0, 2, 131, 0, 0],
      communicateThruEX: [255, 80, 0, 1, 0],
      communicateThruEXFooter: [0, 0, 0]
    });
    u(this, "confSet");
    this.device = t, this.debugEnabled = e;
    const n = (i, h) => i.alternate.endpoints.find((f) => f.direction === h);
    if (!this.device.configuration)
      throw new Error("configurationがありません");
    const s = this.device.configuration, r = s.interfaces[s.configurationValue], a = n(r, "in");
    if (!a) throw new Error("入力USBエンドポイントが取得できませんでした");
    const d = n(r, "out");
    if (!d) throw new Error("出力USBエンドポイントが取得できませんでした");
    this.confSet = {
      confValue: s.configurationValue,
      interfaceNum: r.interfaceNumber,
      endPointInNum: a.endpointNumber,
      endPointInPacketSize: a.packetSize,
      endPointOutNum: d.endpointNumber,
      endPointOutPacketSize: d.packetSize
    };
  }
  async open() {
    const { confValue: t, interfaceNum: e } = this.confSet;
    await this.device.open(), await this.device.selectConfiguration(t), await this.device.claimInterface(e), await this.sendUsb(
      this.commands.endTransparent,
      "End Transeparent Session"
    ), await this.recvUsb(64), await this.sendUsb(
      this.commands.startTransparent,
      "Start Transeparent Session"
    ), await this.recvUsb(64), await this.sendUsb(this.commands.turnOff, "Turn Off RF"), await c(50), await this.recvUsb(64), await c(50), await this.sendUsb(this.commands.turnOn, "Turn On RF"), await c(50), await this.recvUsb(64), await c(50);
  }
  /**
   * デバイスのクローズ
   * @returns
   */
  async close() {
    const { interfaceNum: t } = this.confSet;
    await this.sendUsb(this.commands.turnOff, "Turn Off RF"), await c(50), await this.recvUsb(64), await c(50), await this.sendUsb(
      this.commands.endTransparent,
      "End Transeparent Session"
    ), await this.recvUsb(64), await this.device.releaseInterface(t), await this.device.close();
  }
  /**
   * FeliCaの操作
   * communicateThruEXコマンドでWrapして送信
   * @param felicaRequest 処理リクエスト内容
   * @param description 処理説明（デバッグ用）
   * @returns
   */
  async operateFelica(t, e) {
    const n = await this.wrapCTXIns(t);
    await this.sendUsb(n, e);
    const s = await this.recvUsb(64);
    return this.unwrapCTXResponse(s);
  }
  /**
   * PasoRiへの送信
   * @param data
   * @returns
   */
  async sendUsb(t, e = "") {
    const s = ((r) => {
      const a = r.length, d = 0, i = new Uint8Array(10 + a);
      return i[0] = 107, i[1] = 255 & a, i[2] = a >> 8 & 255, i[3] = a >> 16 & 255, i[4] = a >> 24 & 255, i[5] = d, i[6] = ++this.seq, a !== 0 && i.set(r, 10), i;
    })(new Uint8Array(t));
    await this.device.transferOut(this.confSet.endPointOutNum, s), this.debugEnabled && console.log(`${e} Send: ${p(s)}`);
  }
  /**
   * PasoRiの応答取得
   * @param rcvLen
   * @returns
   */
  async recvUsb(t) {
    const { endPointInNum: e } = this.confSet, n = await this.device.transferIn(e, t);
    return this.debugEnabled && console.log(`Recv: ${l(n.data)}`), n;
  }
  /**
   * Felica コマンドを RC-S300 の communicateThruEX 命令形式にラップする。
   */
  async wrapCTXIns(t) {
    const e = t.length, n = [...this.commands.communicateThruEX];
    return n.push(e >> 8 & 255, e & 255), n.push(...t), n.push(...this.commands.communicateThruEXFooter), n;
  }
  /**
   * communicateThruEX レスポンスから Felica 応答データを取り出す。
   */
  unwrapCTXResponse(t) {
    if (!t.data) return;
    const e = b(t.data), n = e.indexOf(151);
    if (n < 0) return;
    const s = n + 1, r = e[s], a = Array.from(e.slice(s + 1, s + 1 + r));
    return {
      length: r,
      responseCode: a[1],
      data: a.slice(2)
    };
  }
  /**
   * オープン状態の取得
   */
  get isOpened() {
    return this.device.opened;
  }
  /**
   * ベンダIDの取得
   */
  get vendorId() {
    return this.device.vendorId;
  }
  /**
   * プロダクトIDの取得
   */
  get productId() {
    return this.device.productId;
  }
}
export {
  U as FelicaReaderRcS300
};
