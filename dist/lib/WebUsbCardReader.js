import { FelicaService as r } from "./FelicaService.js";
import { sleep as s } from "./utils.js";
class t {
  /**
   * constructor (private)
   * @param usbDevice
   */
  constructor(c) {
    this.felicaService = c;
  }
  /**
   * デバイスに接続
   * @returns
   */
  static async connect(c = [], e = !1) {
    const i = await r.connectFelicaReader(
      c,
      e
    );
    return i ? new t(i) : void 0;
  }
  /**
   * IDm読み取り
   * @returns
   */
  async polling(c = 10) {
    let e = 1, i;
    try {
      for (; !i && e <= c; )
        e++, await this.felicaService.openDevice(), i = await this.felicaService.polling(), await this.felicaService.closeDevice(), i || await s(1e3);
    } catch (a) {
      throw this.felicaService.felicaReader.isOpened && await this.felicaService.closeDevice(), a;
    }
    return i;
  }
  /**
   * Service確認
   * @returns
   */
  async requestService(c) {
    try {
      const e = await this.polling();
      if (!e)
        return;
      await this.felicaService.openDevice();
      const i = await this.felicaService.requestService(
        e.idm,
        c
      );
      return await this.felicaService.closeDevice(), i;
    } catch (e) {
      throw this.felicaService.felicaReader.isOpened && await this.felicaService.closeDevice(), e;
    }
  }
  /**
   * データ読み取り（暗号化無し）
   * @returns
   */
  async readWithoutEncryption(c) {
    try {
      const e = await this.polling();
      if (!e)
        return;
      await this.felicaService.openDevice();
      const i = await this.felicaService.readWithoutEncryption(
        e.idm,
        c
      );
      return await this.felicaService.closeDevice(), i;
    } catch (e) {
      throw this.felicaService.felicaReader.isOpened && await this.felicaService.closeDevice(), e;
    }
  }
}
export {
  t as WebUsbCardReader
};
