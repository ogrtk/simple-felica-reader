import { FelicaReaderRcS300 } from "./FelicaReaderRcS300";
import type { IFelicaReader } from "./IFelicaReader";
export declare const felicaReaderModels: {
    readonly "RC-S300/S": {
        readonly vendorId: 1356;
        readonly productId: 3528;
        readonly readerClass: typeof FelicaReaderRcS300;
    };
    readonly "RC-S300/P": {
        readonly vendorId: 1356;
        readonly productId: 3529;
        readonly readerClass: typeof FelicaReaderRcS300;
    };
};
export type FelicaReaderModelName = keyof typeof felicaReaderModels;
export type FelicaPollingResult = {
    idm: string;
    systemCode: string;
};
export type FelicaRequestServiceResult = {
    idm: string;
    nodeCount: string;
    nodeKeyVerList: string;
};
export type FelicaReadWithoutEncryptionResult = {
    idm: string;
    statusFlag1: string;
    statusFlag2: string;
    blockSize: string;
    blockData: string;
};
export declare class FelicaService {
    felicaReader: IFelicaReader;
    /**
     * FeliCaリーダー機器への接続
     * @param readerFilter 接続を許可する機器の型番リスト
     * @param debugEnabled デバッグを有効にする
     * @returns
     */
    static connectFelicaReader(readerFilter?: FelicaReaderModelName[], debugEnabled?: boolean): Promise<FelicaService | undefined>;
    /**
     * コンストラクタ
     * @param felicaReader
     */
    protected constructor(felicaReader: IFelicaReader);
    /**
     * デバイスのオープン
     * @returns
     */
    openDevice(): Promise<void>;
    /**
     * デバイスのクローズ
     * @returns
     */
    closeDevice(): Promise<void>;
    /**
     * Felica のポーリング操作を実行し、IDm とシステムコードを返す。
     */
    polling(timeoutPerRun?: number): Promise<FelicaPollingResult | undefined>;
    /**
     * Felica の RequestService 操作。
     * @param idm Felica のIDm（16進数文字列）
     * @param nodeCodeList ノードコードの配列（各コードは数値）
     */
    requestService(idm: string, nodeCodeList: number[]): Promise<FelicaRequestServiceResult | undefined>;
    /**
     * Felica の暗号化無しデータ読み取り操作。
     * @param idm Felica のIDm（16進数文字列）
     * @param params 各サービスに対するパラメータの配列
     */
    readWithoutEncryption(idm: string, params: Array<{
        serviceCode: string;
        blockListParam: {
            accessMode: "normal" | "purse-cashback";
            blockNoStart: number;
            blockNoEnd: number;
        };
    }>): Promise<FelicaReadWithoutEncryptionResult | undefined>;
    /**
     * Felica コマンドをラップし、送受信、レスポンスの解析までを行う。
     */
    private felicaOperation;
    private constructFelicaRequest;
    /**
     * ブロックリストを構成する。
     * @param param ブロック範囲とアクセスモード
     * @param serviceListOrder サービスリスト内の順序
     */
    private constructBlockList;
}
