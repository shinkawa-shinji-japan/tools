# PayPay statement HTML → CSV

保存済みの明細HTMLをCSVに変換するシンプルなCLIです。

## セットアップ

```bash
cd tools/paypay-statement-to-csv
yarn install
```

## 使い方

```bash
# html.html から output.csv に変換（デフォルト）
yarn csv

# カスタムパスを指定
npx ts-node src/index.ts input.html output.csv

# 標準出力に出力（ファイルに保存しない）
npx ts-node src/index.ts html.html
```

- 入力: 静的なHTMLファイル（例: `html.html`）
- 出力: CSVファイル（例: `output.csv`）または標準出力
- カラム: `item_name,usage_date,payment_date,amount,payment_method`
- 最終行に `TOTAL` として合計額を出力

## 補足
- HTML中のクラス名が変わっても、ラベルや構造にある程度追随できるよう、クラスの部分一致とラベルテキストで抽出しています。
- 金額は全角/半角を正規化し、カンマを除去して数値化しています。
