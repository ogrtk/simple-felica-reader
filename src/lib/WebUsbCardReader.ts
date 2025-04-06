import { type FelicaReaderModelName, FelicaService } from "./FelicaService";
import { sleep } from "./utils";

export type BlockListParam = {
  accessMode: "normal" | "purse-cashback";
  blockNoStart: number;
  blockNoEnd: number;
};

export type ReadServiceParam = {
  serviceCode: string;
  blockListParam: BlockListParam;
};

export class WebUsbCardReader {
  /**
   * constructor (private)
   * @param usbDevice
   */
  private constructor(public felicaService: FelicaService) {}

  /**
   * デバイスに接続
   * @returns
   */
  static async connect(
    readerFilter: FelicaReaderModelName[] = [],
    debugEnabled = false,
  ) {
    const felicaService = await FelicaService.connectFelicaReader(
      readerFilter,
      debugEnabled,
    );
    return felicaService ? new WebUsbCardReader(felicaService) : undefined;
  }

  /**
   * IDm読み取り
   * @returns
   */
  public async polling(maxTryCount = 10) {
    let nextTryCount = 1;
    let response: Awaited<ReturnType<typeof this.felicaService.polling>> =
      undefined;

    try {
      while (!response && nextTryCount <= maxTryCount) {
        nextTryCount++;
        await this.felicaService.openDevice();
        response = await this.felicaService.polling();
        await this.felicaService.closeDevice();
        if (!response) await sleep(1000);
      }
    } catch (e: unknown) {
      if (this.felicaService.felicaReader.isOpened)
        await this.felicaService.closeDevice();
      throw e;
    }

    return response;
  }

  /**
   * Service確認
   * @returns
   */
  public async requestService(nodeCodeList: number[]) {
    try {
      const pollingResponse = await this.polling();

      if (!pollingResponse) {
        return undefined;
      }

      await this.felicaService.openDevice();
      const result = await this.felicaService.requestService(
        pollingResponse.idm,
        nodeCodeList,
      );
      await this.felicaService.closeDevice();

      return result;
    } catch (e: unknown) {
      if (this.felicaService.felicaReader.isOpened)
        await this.felicaService.closeDevice();
      throw e;
    }
  }

  /**
   * データ読み取り（暗号化無し）
   * @returns
   */
  public async readWithoutEncryption(params: ReadServiceParam[]) {
    try {
      const pollingResponse = await this.polling();

      if (!pollingResponse) {
        return undefined;
      }

      await this.felicaService.openDevice();
      const result = await this.felicaService.readWithoutEncryption(
        pollingResponse.idm,
        params,
      );
      await this.felicaService.closeDevice();
      // this.felicaService.closeDevice();

      return result;
    } catch (e: unknown) {
      if (this.felicaService.felicaReader.isOpened)
        await this.felicaService.closeDevice();
      throw e;
    }
  }
}
