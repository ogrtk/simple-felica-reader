import type { FelicaOperationResult, IFelicaReader } from "./IFelicaReader";
/**
 *
 */
export declare class FelicaReaderRcS300 implements IFelicaReader {
    private device;
    private debugEnabled;
    private seq;
    private commands;
    private confSet;
    constructor(device: USBDevice, debugEnabled?: boolean);
    open(): Promise<void>;
    /**
     * デバイスのクローズ
     * @returns
     */
    close(): Promise<void>;
    /**
     * FeliCaの操作
     * communicateThruEXコマンドでWrapして送信
     * @param felicaRequest 処理リクエスト内容
     * @param description 処理説明（デバッグ用）
     * @returns
     */
    operateFelica(felicaRequest: number[], description: string): Promise<FelicaOperationResult>;
    /**
     * PasoRiへの送信
     * @param data
     * @returns
     */
    private sendUsb;
    /**
     * PasoRiの応答取得
     * @param rcvLen
     * @returns
     */
    private recvUsb;
    /**
     * Felica コマンドを RC-S300 の communicateThruEX 命令形式にラップする。
     */
    private wrapCTXIns;
    /**
     * communicateThruEX レスポンスから Felica 応答データを取り出す。
     */
    private unwrapCTXResponse;
    /**
     * オープン状態の取得
     */
    get isOpened(): boolean;
    /**
     * ベンダIDの取得
     */
    get vendorId(): number;
    /**
     * プロダクトIDの取得
     */
    get productId(): number;
}
