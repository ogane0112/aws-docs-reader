# aws-docs-reader

AWS公式ドキュメントを1〜2年かけて通読するための、個人用の進捗管理PWA。
詳細な要件は [`docs/requirements.md`](docs/requirements.md) を参照。

## 現在の実装状況

| マイルストーン | 状態 |
|---|---|
| M1 目次生成 | ✅ `cmd/gentoc`（下記参照） |
| M2 画面と端末内保存 | ✅ ホーム・ガイド一覧・目次画面、Dexie(IndexedDB)での保存 |
| M3 読了確認と進捗表示 | ✅ 戻り時の確認シート、完了予定日の算出 |
| M4 Gist同期 | ✅ 実装済み。ただし実際のPATを使った同期は**未検証**（下記「検証ステータス」参照） |
| M5 PWA化とデプロイ | 🟡 manifest・Service Worker(`vite-plugin-pwa`)とGitHub Pagesへのデプロイワークフローは用意済み。アイコンはプレースホルダー |

## セットアップ・開発

```sh
npm install
npm run dev       # http://localhost:5173/aws-docs-reader/
npm run build     # dist/ に本番ビルド
npm test          # 進捗計算ロジックのユニットテスト (vitest)
npm run lint      # 型チェックのみ
```

`public/data/guides.json` と `public/data/toc/*.json` が無いと画面には何も表示されない。
`go run ./cmd/gentoc` を一度実行するか、GitHub Actionsの `generate-toc.yml` の実行を待つ（後述）。

## 画面構成

要件書7章のとおり、下部タブでホーム・ガイド・復習・設定を切り替える（`HashRouter`使用、GitHub Pagesの404回避のため）。

- **ホーム** (`src/pages/Home.tsx`): 次に読むページ、全体進捗と完了予定日、今週読んだページ数、要復習件数
- **ガイド一覧** (`Guides.tsx`) → **目次** (`GuideDetail.tsx` + `components/TocTree.tsx`): 章の折りたたみ・進捗率、ページ行のタップでステータス循環（読了→要復習→スキップ→読了…）、長押しで公式ページを開く
- **復習** (`Review.tsx`): 要復習ページ一覧・メモ付きページ一覧
- **設定** (`Settings.tsx`): GitHubトークン入力・手動同期・エクスポート/インポート

読了確認シート（`components/ConfirmSheet.tsx` + `ReadConfirmController.tsx`）は、公式ページを開いた後に
`visibilitychange`/`focus` でアプリに戻ってきたタイミングで表示する（`lib/lastOpened.ts` が `sessionStorage` で
「直前に開いたページ」を覚えておく仕組み）。

## データ保存・同期

- 端末内保存: `src/db.ts`（Dexie / IndexedDB）。未読ページは保存しない（`status`テーブルに行がない = 未読）。
- Gist同期: `src/api/gist.ts` が `gist`スコープのPATでGitHub REST APIを叩き、`aws-docs-reader.json`という
  シークレットGistを検索/作成/読み書きする。マージロジック（ページ単位で`updatedAt`が新しい方を採用）は
  `src/lib/progress.ts#mergeProgress` に切り出してユニットテスト済み。
- 同期タイミング: 起動時・`visibilitychange`での復帰時・`online`イベント時・ステータス変更後3秒のデバウンス
  （`src/context/AppDataContext.tsx`）。

### ⚠️ 検証ステータス（重要）

- **Gist同期は実際のPersonal Access Tokenを使った通しテストをしていない。** このセッションのサンドボックス
  からは `api.github.com` 自体には到達できたが、ブラウザ経由のE2Eテストでは自分のトークンを使う理由がないため
  行っていない。`設定`画面でトークンを保存すると実際にGist検索/作成のAPIが呼ばれるので、**初回は必ず自分の
  環境で動作確認すること**（複数端末間でステータス変更→同期→もう一方の端末で反映、の一往復）。
- **`react-router-dom`にmoderateな既知の脆弱性（GHSA-wrjc-x8rr-h8h6 / GHSA-337j-9hxr-rhxg）が残っている。**
  修正版はv7系のみで、v6→v7は破壊的変更を伴うため今回は見送った。このアプリはSSRを行わず、`<Link>`/
  `useNavigate`に渡す遷移先はすべて`guides.config.yaml`由来の固定値（ユーザー入力や外部データではない）
  なので実害はないと判断しているが、`npm audit`で継続的に確認すること。
- 目次生成（`cmd/gentoc`）側の検証ステータスは変更なし。詳細は次のセクション。

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

### ⚠️ toc-contents.json の検証ステータス

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
go test ./...   # 目次生成スクリプト
npm test        # フロントエンドの進捗計算ロジック
```

Goのテスト（`parser_tocjson_test.go` / `parser_sitemap_test.go` / `generate_test.go`）はいずれもネットワークを
使わないオフラインの単体テスト（`Fetcher` インターフェースをテスト用のフェイクに差し替えている）。
フロントエンドのテスト（`src/lib/progress.test.ts`）はマージロジック・完了予定日算出などの純粋関数のみを対象とし、
UIやIndexedDB/Gist連携は含まない（それらはブラウザでの手動確認で検証済み：ホーム→公式ページ起動→戻り時の
確認シート→ステータス反映→リロード後も永続化、の一連の流れをPlaywrightで確認している）。

## GitHub Actions

- `.github/workflows/generate-toc.yml`: 毎週月曜（JST 9時）に `gentoc` を実行し、`public/data` に差分があれば
  自動コミットする（要件書6章のとおり）。
- `.github/workflows/deploy.yml`: `main`へのpush時に `npm run build` してGitHub Pagesへデプロイする。
  リポジトリの Settings → Pages → Source を「GitHub Actions」に設定する必要がある。

## 未実装・既知の制約

- PWAアイコンはプレースホルダーのSVG（`public/icons/icon.svg`）。実際のアイコンデザインは未着手。
- 目次上のステータスを「未読」に巻き戻すUIは無い（`components/StatusIcon.tsx`のコメント参照）。未読ページは
  レコード自体を保存しない設計のため、削除によって未読を表現するとGist同期の競合解決（updatedAt比較）で
  復活してしまう。tombstone方式などが必要になるため、要件範囲外として意図的に見送っている。
- 複数ページの一括ステータス変更はMVP対象外（要件書3.2のとおり）。
