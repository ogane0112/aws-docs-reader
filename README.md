# aws-docs-reader

AWS公式ドキュメントを1〜2年かけて通読するための、個人用の進捗管理PWA。
詳細な要件は [`docs/requirements.md`](docs/requirements.md) を参照。

## 現在の実装状況

このリポジトリは現時点では **要件書6章「目次データの生成」のGoスクリプト（`cmd/gentoc`）のみ** を実装している。
フロントエンド（Vite + React + TypeScript のPWA本体）、IndexedDBでの端末内保存、Gist同期は未実装。

## `cmd/gentoc`：目次データ生成スクリプト

`guides.config.yaml` に列挙したガイドごとに、公式サイトから目次を取得し、
`public/data/guides.json` と `public/data/toc/{guideId}.json` を生成する。

取得元は各ガイドの `toc-contents.json` を第一候補とし、取得できない場合（404・パース失敗など）は
`sitemap.xml` にフォールバックする（要件書どおり）。

### 使い方

```sh
go run ./cmd/gentoc -config guides.config.yaml -out public/data
```

- `-config`: ガイド一覧ファイル（デフォルト `guides.config.yaml`）
- `-out`: 出力先ディレクトリ（デフォルト `public/data`）
- `-timeout`: 1リクエストあたりのタイムアウト（デフォルト20秒）
- `-fail-on-error`: 1件でも取得失敗したら非ゼロ終了する（CIでの検知用）

### 挙動

- ガイドの取得に失敗した場合、`guides.json` の当該エントリは**前回生成分の値を保持する**（完全に消えない）。前回分もない場合はそのガイドをスキップする。
- 目次データのキー・URLは常に絶対URL（`baseUrl` からの相対パスを解決した値）で出力する。

## ⚠️ 検証ステータス（重要）

要件書6章に「※取得元の形式はプロトタイプで要検証」とある通り、`toc-contents.json` の実際のスキーマは
**このスクリプトを書いた時点では未検証**。実装した環境のネットワークegressが `docs.aws.amazon.com` への
アクセスをポリシーでブロックしていたため、実際のレスポンスを1件も取得できなかった。

そのため:

- `internal/gentoc/parser_tocjson.go` は、いくつかの想定されるJSON形状（配列直下 / `contents`等のキーで
  ラップされたオブジェクト、`title`/`label`/`name` 等の複数のキー名候補）を許容する**ヒューリスティックな
  パーサ**として実装した。実データでの動作は保証されない。
- `internal/gentoc/parser_sitemap.go` の方は `sitemap.xml`（sitemaps.org標準規格）を素直にパースするだけなので、
  形式面のリスクはない。ただしsitemapには章立て・順序の保証がないため、フォールバック時のページ順は
  URLの辞書順になり、公式の目次順とは一致しない点に注意（要件書3.1「並び順は公式の目次順」を厳密には満たせない）。

**次にネットワークアクセスがある環境で必ずやること:**

1. `curl https://docs.aws.amazon.com/AmazonECS/latest/developerguide/toc-contents.json` 等で実データを1件取得する
2. 取得したJSONを `internal/gentoc/testdata/` にfixtureとして保存する
3. 実際のキー名・ネスト構造に合わせて `parser_tocjson.go` のキー名候補（`titleKeys` / `hrefKeys` / `childrenKeys`）を調整し、
   そのfixtureを使ったテストを追加する
4. `go run ./cmd/gentoc` を実際のガイド（ECS/DynamoDB/Aurora）に対して実行し、生成された `public/data/toc/*.json` の
   ページ数・順序が公式サイトの目次と一致するか目視確認する

## テスト

```sh
go test ./...
```

`parser_tocjson_test.go` / `parser_sitemap_test.go` / `generate_test.go` は、いずれもネットワークを使わない
オフラインの単体テスト（`Fetcher` インターフェースをテスト用のフェイクに差し替えている）。

## GitHub Actions

`.github/workflows/generate-toc.yml` が毎週月曜（JST 9時）に `gentoc` を実行し、`public/data` に差分があれば
自動コミットする（要件書6章のとおり）。GitHub Pagesへのデプロイ・PWA本体のビルドは、フロントエンド実装後に追加する。
