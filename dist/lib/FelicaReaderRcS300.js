import { arrayToHex, binArrayToHex, dataViewToUint8Array, sleep, } from "./utils";
/**
 *
 */
export class FelicaReaderRcS300 {
    device;
    debugEnabled;
    seq = 0;
    // RC-S300 のコマンド定義
    commands = {
        startTransparent: [0xff, 0x50, 0x00, 0x00, 0x02, 0x81, 0x00, 0x00],
        turnOn: [0xff, 0x50, 0x00, 0x00, 0x02, 0x84, 0x00, 0x00],
        endTransparent: [0xff, 0x50, 0x00, 0x00, 0x02, 0x82, 0x00, 0x00],
        turnOff: [0xff, 0x50, 0x00, 0x00, 0x02, 0x83, 0x00, 0x00],
        communicateThruEX: [0xff, 0x50, 0x00, 0x01, 0x00],
        communicateThruEXFooter: [0x00, 0x00, 0x00],
    };
    confSet;
    constructor(device, debugEnabled = false) {
        this.device = device;
        this.debugEnabled = debugEnabled;
        const getEndPoint = (usbIf, direction) => usbIf.alternate.endpoints.find((ep) => ep.direction === direction);
        if (!this.device.configuration)
            throw new Error("configurationがありません");
        const usbConf = this.device.configuration;
        const usbIf = usbConf.interfaces[usbConf.configurationValue];
        const inEp = getEndPoint(usbIf, "in");
        if (!inEp)
            throw new Error("入力USBエンドポイントが取得できませんでした");
        const outEp = getEndPoint(usbIf, "out");
        if (!outEp)
            throw new Error("出力USBエンドポイントが取得できませんでした");
        this.confSet = {
            confValue: usbConf.configurationValue,
            interfaceNum: usbIf.interfaceNumber,
            endPointInNum: inEp.endpointNumber,
            endPointInPacketSize: inEp.packetSize,
            endPointOutNum: outEp.endpointNumber,
            endPointOutPacketSize: outEp.packetSize,
        };
    }
    async open() {
        const { confValue, interfaceNum } = this.confSet;
        await this.device.open();
        await this.device.selectConfiguration(confValue); // USBデバイスの構成を選択
        await this.device.claimInterface(interfaceNum); // USBデバイスの指定インターフェイスを排他アクセスにする
        await this.sendUsb(this.commands.endTransparent, "End Transeparent Session");
        await this.recvUsb(64);
        await this.sendUsb(this.commands.startTransparent, "Start Transeparent Session");
        await this.recvUsb(64);
        await this.sendUsb(this.commands.turnOff, "Turn Off RF");
        await sleep(50);
        await this.recvUsb(64);
        await sleep(50);
        await this.sendUsb(this.commands.turnOn, "Turn On RF");
        await sleep(50);
        await this.recvUsb(64);
        await sleep(50);
    }
    /**
     * デバイスのクローズ
     * @returns
     */
    async close() {
        const { interfaceNum } = this.confSet;
        await this.sendUsb(this.commands.turnOff, "Turn Off RF");
        await sleep(50);
        await this.recvUsb(64);
        await sleep(50);
        await this.sendUsb(this.commands.endTransparent, "End Transeparent Session");
        await this.recvUsb(64);
        // USBデバイスの指定インターフェイスを排他アクセスを解放する
        await this.device.releaseInterface(interfaceNum);
        await this.device.close();
        return;
    }
    /**
     * FeliCaの操作
     * communicateThruEXコマンドでWrapして送信
     * @param felicaRequest 処理リクエスト内容
     * @param description 処理説明（デバッグ用）
     * @returns
     */
    async operateFelica(felicaRequest, description) {
        const wrappedCommand = await this.wrapCTXIns(felicaRequest);
        await this.sendUsb(wrappedCommand, description);
        const cTXResponse = await this.recvUsb(64);
        return this.unwrapCTXResponse(cTXResponse);
    }
    /**
     * PasoRiへの送信
     * @param data
     * @returns
     */
    async sendUsb(data, trcMsg = "") {
        /**
         * PasoRiのリクエストヘッダー付与
         */
        const addReqHeader = (argData) => {
            const dataLen = argData.length;
            const SLOTNUMBER = 0x00;
            const retVal = new Uint8Array(10 + dataLen);
            retVal[0] = 0x6b; // ヘッダー作成
            retVal[1] = 255 & dataLen; // length をリトルエンディアン
            retVal[2] = (dataLen >> 8) & 255;
            retVal[3] = (dataLen >> 16) & 255;
            retVal[4] = (dataLen >> 24) & 255;
            retVal[5] = SLOTNUMBER; // タイムスロット番号
            retVal[6] = ++this.seq; // 認識番号
            0 !== dataLen && retVal.set(argData, 10); // コマンド追加
            return retVal;
        };
        const reqData = addReqHeader(new Uint8Array(data));
        await this.device.transferOut(this.confSet.endPointOutNum, reqData);
        if (this.debugEnabled)
            console.log(`${trcMsg} Send: ${arrayToHex(reqData)}`);
    }
    /**
     * PasoRiの応答取得
     * @param rcvLen
     * @returns
     */
    async recvUsb(rcvLen) {
        const { endPointInNum } = this.confSet;
        const res = await this.device.transferIn(endPointInNum, rcvLen);
        if (this.debugEnabled)
            console.log(`Recv: ${binArrayToHex(res.data)}`);
        return res;
    }
    /**
     * Felica コマンドを RC-S300 の communicateThruEX 命令形式にラップする。
     */
    async wrapCTXIns(felicaRequest) {
        const felicaReqLen = felicaRequest.length;
        const cTX = [...this.commands.communicateThruEX];
        cTX.push((felicaReqLen >> 8) & 0xff, felicaReqLen & 0xff);
        cTX.push(...felicaRequest);
        cTX.push(...this.commands.communicateThruEXFooter);
        return cTX;
    }
    /**
     * communicateThruEX レスポンスから Felica 応答データを取り出す。
     */
    unwrapCTXResponse(cTXResponse) {
        if (!cTXResponse.data)
            return undefined;
        const data = dataViewToUint8Array(cTXResponse.data);
        const idx = data.indexOf(0x97);
        if (idx < 0)
            return undefined;
        const lenIndex = idx + 1;
        const length = data[lenIndex];
        const allData = Array.from(data.slice(lenIndex + 1, lenIndex + 1 + length));
        return {
            length,
            responseCode: allData[1],
            data: allData.slice(2),
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
