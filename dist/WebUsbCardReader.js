import { FelicaService } from "./FelicaService";
import { sleep } from "./utils";
export class WebUsbCardReader {
    felicaService;
    /**
     * constructor (private)
     * @param usbDevice
     */
    constructor(felicaService) {
        this.felicaService = felicaService;
    }
    /**
     * デバイスに接続
     * @returns
     */
    static async connect(readerFilter = [], debugEnabled = false) {
        const felicaService = await FelicaService.connectFelicaReader(readerFilter, debugEnabled);
        return felicaService ? new WebUsbCardReader(felicaService) : undefined;
    }
    /**
     * IDm読み取り
     * @returns
     */
    async polling(maxTryCount = 10) {
        let nextTryCount = 1;
        let response = undefined;
        try {
            while (!response && nextTryCount <= maxTryCount) {
                nextTryCount++;
                await this.felicaService.openDevice();
                response = await this.felicaService.polling();
                await this.felicaService.closeDevice();
                if (!response)
                    await sleep(1000);
            }
        }
        catch (e) {
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
    async requestService(nodeCodeList) {
        try {
            const pollingResponse = await this.polling();
            if (!pollingResponse) {
                return undefined;
            }
            await this.felicaService.openDevice();
            const result = await this.felicaService.requestService(pollingResponse.idm, nodeCodeList);
            await this.felicaService.closeDevice();
            return result;
        }
        catch (e) {
            if (this.felicaService.felicaReader.isOpened)
                await this.felicaService.closeDevice();
            throw e;
        }
    }
    /**
     * データ読み取り（暗号化無し）
     * @returns
     */
    async readWithoutEncryption(params) {
        try {
            const pollingResponse = await this.polling();
            if (!pollingResponse) {
                return undefined;
            }
            await this.felicaService.openDevice();
            const result = await this.felicaService.readWithoutEncryption(pollingResponse.idm, params);
            await this.felicaService.closeDevice();
            // this.felicaService.closeDevice();
            return result;
        }
        catch (e) {
            if (this.felicaService.felicaReader.isOpened)
                await this.felicaService.closeDevice();
            throw e;
        }
    }
}
