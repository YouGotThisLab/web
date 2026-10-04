# 有出息 YouChuXi

2026 年 11 月 28 日台灣九合一地方選舉的像素迷因遊樂場。

[官網立即玩 ↗](https://youchuxi.k66inthesky.workers.dev/) · [觀看示範影片 ▶](https://youtu.be/VZSrQtIqvQw)

[![有出息 YouChuXi 示範影片，點擊前往 YouTube 播放](https://i.ytimg.com/vi/VZSrQtIqvQw/hqdefault.jpg)](https://youtu.be/VZSrQtIqvQw)

*點擊縮圖觀看示範：選縣市、點人物，一起累積出息值。*

首頁直接顯示 22 縣市地圖，顏色代表本站收錄的人數。選縣市後人物出場，點大頭累積本機出息值及後台獨立計算的全站分數，也可以下載附創作標示的梗圖。

人物全站累計出息值顯示於名字右側，所有裝置透過 WebSocket 即時更新；遊戲視窗保留個人本機分數。每次點擊固定增加 1 點，連擊只加強彩色跳字與爆發動畫，不改變得分。右側累計數字採加大型漸層立體描邊與光暈。啟用減少動態效果時，保留計分並關閉跳字動畫。

## 開發

需要 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
```

依終端機顯示的網址開啟預覽。

```sh
npm test
npm run format:check
npm run build
npm audit --audit-level=moderate
```

## 人物與資料

目前精選 12 位人物、7 個縣市，涵蓋全部九種地方公職；並非完整候選人名冊。灰色縣市表示尚未收錄。參選登記、政黨提名、媒體報導參選分別標示，最終資格以選委會公告為準。資料查證日期：2026-10-04。

- `src/data.ts`：姓名、所屬政黨、選區、公職、1–3 個綽號及新聞／參選來源。
- `src/model.ts`：九種公職、22 縣市、篩選與安全計數讀取。
- `src/main.ts`：互動地圖、人物遊戲、音效、梗圖下載。
- `public/assets/*.webp`：12 張原創 AI 像素人物插畫。
- [生成提示與素材清單](docs/image-prompts.json)：各張插畫的提示及專案輸出位置。
- [資料與圖片來源](docs/sources.md)：資料核對與地圖授權說明。

公開稱呼附來源；「本站創作」綽號及梗句不代表本人發言。圖片是諷刺插畫，不是新聞現場照片。

個人出息值儲存在瀏覽器 localStorage；全站分數由 Cloudflare Durable Object 的 SQLite 後台持久保存並推送。全站分數由後台獨立計算，每次有效點擊固定增加 1 點；個人分數只記錄此裝置的點擊。舊的本機分數不會匯入全站。停用本機儲存仍可玩。同步中斷時保留本頁最近 15 次待同步點擊，重連會重送並防重，1 小時後放棄待同步事件；關閉頁面會丟失待同步事件。這是遊戲數據，沒有真實投票功能。網站支援鍵盤、手機與減少動態效果偏好。

## 部署與私人設定

此儲存庫只包含網站、人物素材、測試與後台程式碼。Cloudflare、AWS、Sites 專案設定、憑證與所有 env 檔均未納入版本控制，已加入 `.gitignore`。

`npm run build` 產生 `dist`。若使用 Cloudflare 後台，請在本機建立自己的 Wrangler 設定，將 `worker/index.ts` 設為入口、`dist` 設為靜態資產目錄，並配置 `ASSETS` 與 `SCORES` 綁定及 `Scores` SQLite Durable Object migration。設定檔保留於本機。

```sh
npm run check:worker
npm run dev:cloudflare
node scripts/verify-sync.mjs
```

`verify-sync` 預設使用本機 `http://127.0.0.1:8787`。只讀檢查可使用 `SYNC_TEST_URL` 指定網址：

```sh
SYNC_TEST_URL=https://your-site.example node scripts/verify-live-readonly.mjs
```

後台提供 `GET /api/scores` 與 `/api/live` WebSocket，支援即時快照、防重、重連及同來源檢查；每次有效點擊固定增加 1 點。沒有管理員資料編輯功能，人物資料由 `src/data.ts` 修改。
