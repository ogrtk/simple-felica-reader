import { type FelicaReaderModelName, FelicaService } from "./FelicaService";
export type BlockListParam = {
    accessMode: "normal" | "purse-cashback";
    blockNoStart: number;
    blockNoEnd: number;
};
export type ReadServiceParam = {
    serviceCode: string;
    blockListParam: BlockListParam;
};
export declare class WebUsbCardReader {
    felicaService: FelicaService;
    /**
     * constructor (private)
     * @param usbDevice
     */
    private constructor();
    /**
     * デバイスに接続
     * @returns
     */
    static connect(readerFilter?: FelicaReaderModelName[], debugEnabled?: boolean): Promise<WebUsbCardReader | undefined>;
    /**
     * IDm読み取り
     * @returns
     */
    polling(maxTryCount?: number): Promise<import("./FelicaService").FelicaPollingResult | undefined>;
    /**
     * Service確認
     * @returns
     */
    requestService(nodeCodeList: number[]): Promise<import("./FelicaService").FelicaRequestServiceResult | undefined>;
    /**
     * データ読み取り（暗号化無し）
     * @returns
     */
    readWithoutEncryption(params: ReadServiceParam[]): Promise<import("./FelicaService").FelicaReadWithoutEncryptionResult | undefined>;
}
