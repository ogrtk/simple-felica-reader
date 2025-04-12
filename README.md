# @ogrtk/simple-felica-reader

WebUSB を通じて Felica リーダー（例: RC-S300）から IDm やブロックメモリを読み取る TypeScript ライブラリです。

## 特徴

- WebUSB を使用してブラウザから直接 Felica リーダーと通信
- IDm の取得やサービス確認、ブロックの読み取り（非暗号）に対応
- TypeScript による型安全な設計
- RC-S300/P・S 系モデルに対応

## インストール

```bash
npm install @ogrtk/simple-felica-reader
```

または

```bash
pnpm add @ogrtk/simple-felica-reader
```

## 使用例

```ts
import { WebUsbCardReader } from "@ogrtk/simple-felica-reader";

const reader = await WebUsbCardReader.connect(["RC-S300/P"], true);
if (!reader) throw new Error("リーダーに接続できませんでした");

const idmInfo = await reader.polling();
console.log("IDm:", idmInfo?.idm);

const serviceResult = await reader.requestService([0x0009]);
console.log("Service:", serviceResult);

const blockData = await reader.readWithoutEncryption([
  {
    serviceCode: "0900",
    blockListParam: {
      accessMode: "normal",
      blockNoStart: 0,
      blockNoEnd: 1,
    },
  },
]);
console.log("Block:", blockData);
```

## API

### `WebUsbCardReader`

#### `static connect(readerFilter?: FelicaReaderModelName[], debugEnabled?: boolean): Promise<WebUsbCardReader | undefined>`

Felica リーダーに接続し、インスタンスを生成します。  
`readerFilter` で `"RC-S300/P"` などのモデル名を指定可能です。

#### `polling(maxTryCount = 10): Promise<{ idm: string } | undefined>`

Felica カードを検出して IDm を取得します。最大試行回数は `maxTryCount` で設定可能。

#### `requestService(nodeCodeList: number[]): Promise<Uint8Array[] | undefined>`

指定されたサービスコードがカード上に存在するか確認します。

#### `readWithoutEncryption(params: ReadServiceParam[]): Promise<Uint8Array[] | undefined>`

暗号化なしでブロックデータを読み取ります。各ブロック指定に対して `serviceCode`, `blockNoStart`, `blockNoEnd` を指定します。

### 型定義補足

```ts
type ReadServiceParam = {
  serviceCode: string; // 例: "0900"
  blockListParam: {
    accessMode: "normal" | "purse-cashback";
    blockNoStart: number;
    blockNoEnd: number;
  };
};
```

## 対応環境

- WebUSB をサポートするブラウザ（例: Chrome）
- HTTPS 環境
- 対応デバイス: RC-S300/S, RC-S300/P

## 開発・テスト

```bash
npm run build    # ビルド
npm run test     # 単体テスト（Vitest）
```

## ライセンス

MIT License
