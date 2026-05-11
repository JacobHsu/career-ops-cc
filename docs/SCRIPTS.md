# 腳本參考手冊

所有腳本位於專案根目錄，為 `.mjs` 模組，透過 `npm run <名稱>` 執行。

## 快速參考

| 指令 | 腳本 | 用途 |
|------|------|------|
| `npm run doctor` | `doctor.mjs` | 驗證環境設定是否完整 |
| `npm run verify` | `verify-pipeline.mjs` | 檢查 pipeline 資料完整性 |
| `npm run normalize` | `normalize-statuses.mjs` | 修正非標準狀態值 |
| `npm run dedup` | `dedup-tracker.mjs` | 移除追蹤表中的重複項目 |
| `npm run merge` | `merge-tracker.mjs` | 將批次 TSV 合併進 applications.md |
| `npm run pdf` | `generate-pdf.mjs` | 將 HTML 轉換為 ATS 最佳化 PDF |
| `npm run sync-check` | `cv-sync-check.mjs` | 驗證 CV 與個人檔案的一致性 |
| `npm run update:check` | `update-system.mjs check` | 檢查是否有新版本 |
| `npm run update` | `update-system.mjs apply` | 套用新版本更新 |
| `npm run rollback` | `update-system.mjs rollback` | 回滾上一次更新 |
| `npm run liveness` | `check-liveness.mjs` | 檢查職缺 URL 是否仍有效 |
| `npm run scan` | `scan.mjs` | 零 token 平台掃描器（CakeResume、Ashby、Greenhouse…）|
| `npm run scan-104` | `scan-104.mjs` | 零 token 104.com.tw 直接 API 掃描器 |
| `npm run goodjob` | `goodjob.mjs` | 從 goodjob.life 批次抓取面試心得與薪資概況 |
| `npm run batch104` | `batch104.mjs` | 批次評估 pipeline.md 的 104 職缺（pipeline-to-batch + batch-runner）|

---

## doctor

驗證所有必要條件是否齊備：Node.js >= 18、已安裝依賴套件、Playwright Chromium、必要檔案（`cv.md`、`config/profile.yml`、`portals.yml`）、字型目錄；若 `data/`、`output/`、`reports/` 不存在則自動建立。

```bash
npm run doctor
```

**退出碼：** `0` 所有檢查通過，`1` 有一項或多項失敗（會印出修復建議）。

---

## verify

Pipeline 資料完整性健康檢查。依七項規則驗證 `data/applications.md`：標準狀態值（依 `templates/states.yml`）、無重複公司+職位組合、所有報告連結指向現有檔案、分數符合 `X.XX/5` / `N/A` / `DUP` 格式、行格式正確、`batch/tracker-additions/` 無待處理 TSV、分數欄無 markdown 粗體。

```bash
npm run verify
```

**退出碼：** `0` pipeline 乾淨（零錯誤），`1` 有錯誤。警告（如可能重複）不會造成非零退出。

---

## normalize

將非標準狀態值對應至標準值，並移除狀態欄中的 markdown 粗體與日期。例如 `Enviada` 變為 `Aplicado`、`CERRADA` 變為 `Descartado`。DUPLICADO 資訊會移至備註欄。

```bash
npm run normalize               # 套用變更
npm run normalize -- --dry-run  # 預覽，不寫入檔案
```

執行前會建立 `applications.md` 的 `.bak` 備份。

**退出碼：** `0` 永遠（有無變更皆同）。

---

## dedup

依正規化公司名稱 + 模糊職位比對，移除 `applications.md` 中的重複項目。保留分數最高的那筆。若被移除的項目有更進階的 pipeline 狀態，該狀態會提升至保留項目。

```bash
npm run dedup               # 套用變更
npm run dedup -- --dry-run  # 預覽，不寫入檔案
```

執行前會建立備份。

**退出碼：** `0` 永遠。

---

## merge

將批次追蹤新增項目（`batch/tracker-additions/*.tsv`）合併進 `applications.md`。支援 9 欄 TSV、8 欄 TSV 及 pipe 分隔 Markdown 格式。依報告編號、項目編號及公司+職位模糊比對偵測重複。分數較高的重複評估會就地更新現有項目。

```bash
npm run merge                 # 套用合併
npm run merge -- --dry-run    # 預覽，不寫入檔案
npm run merge -- --verify     # 合併後執行 verify-pipeline
```

已處理的 TSV 會移至 `batch/tracker-additions/merged/`。

**退出碼：** `0` 成功，`1` 使用 `--verify` 時有驗證錯誤。

---

## pdf

透過無頭 Chromium 將 HTML 檔案轉換為高品質、ATS 可解析的 PDF。從 `fonts/` 解析字型路徑，正規化 Unicode 以提升 ATS 相容性（破折號、彎引號、零寬字元），並回報頁數與檔案大小。

```bash
npm run pdf -- input.html output.pdf
npm run pdf -- input.html output.pdf --format=letter   # 美規 Letter
npm run pdf -- input.html output.pdf --format=a4        # A4（預設）
```

**退出碼：** `0` PDF 產生成功，`1` 缺少參數或產生失敗。

---

## sync-check

驗證 career-ops 設定的內部一致性：`cv.md` 存在且內容不過短、`config/profile.yml` 存在且含必要欄位、`modes/_shared.md` 與 `batch/batch-prompt.md` 無硬編碼指標、`article-digest.md` 新鮮度（超過 30 天會發出警告）。

```bash
npm run sync-check
```

**退出碼：** `0` 無錯誤（允許警告），`1` 有錯誤。

---

## update:check

檢查上游是否有新版本，輸出 JSON 至 stdout。

```bash
npm run update:check
```

可能的 JSON 回應：

| `status` | 說明 |
|----------|------|
| `up-to-date` | 本地版本與遠端相同 |
| `update-available` | 有新版本（包含 `local`、`remote`、`changelog`）|
| `dismissed` | 使用者已略過更新提示 |
| `offline` | 無法連線至 GitHub |

**退出碼：** `0` 永遠。

---

## update

套用上游更新。建立備份分支（`backup-pre-update-{version}`）、從正式 repo 拉取、僅取出系統層檔案、執行 `npm install` 並提交。使用者層檔案（`cv.md`、`config/profile.yml`、`data/` 等）永遠不會被修改。

```bash
npm run update
```

**退出碼：** `0` 成功，`1` 鎖定衝突或安全違規。

---

## rollback

從最近一次更新建立的備份分支還原系統層檔案。

```bash
npm run rollback
```

**退出碼：** `0` 成功，`1` 找不到備份分支或 git 錯誤。

---

## liveness

使用無頭 Chromium 測試職缺 URL 是否仍然有效。偵測過期模式（如「職缺已關閉」）、HTTP 404/410、ATS 重新導向模式，以及應徵按鈕是否存在。支援多語言過期模式（英文、德文、法文）。

```bash
npm run liveness -- https://example.com/job/123
npm run liveness -- https://a.com/job/1 https://b.com/job/2
npm run liveness -- --file urls.txt
```

每個 URL 會得到判定結果：`active`（有效）、`expired`（已過期）或 `uncertain`（不確定），並附上原因。

**退出碼：** `0` 所有 URL 有效，`1` 有任何過期或不確定。

---

## scan

零 token 平台掃描器。直接呼叫 ATS API（Greenhouse、Ashby、Lever）和公司職缺頁面，不消耗 LLM token。從 `portals.yml` 讀取目標公司和搜尋查詢，將符合的職缺輸出至 stdout，並選擇性附加至 `data/pipeline.md`。

```bash
npm run scan
```

**退出碼：** `0` 掃描完成，`1` 設定錯誤或找不到 portals.yml。

---

## scan-104

零 token 104.com.tw 掃描器。直接呼叫 104 搜尋 API，不使用 Playwright 或 WebSearch token。從 `portals.yml` 的 `search_queries`（含 `104.com.tw` 的項目）讀取關鍵字，從 `filter_104` 讀取篩選設定。輸出包含地點、刊登日、遠端類型、薪資、技術標籤、公司規模、應徵人數的豐富職缺資訊，並將新結果附加至 `data/pipeline.md` 和 `data/scan-history.tsv`。

```bash
npm run scan-104                              # 完整掃描（每個關鍵字預設 5 頁）
npm run scan-104 -- --dry-run                 # 預覽結果，不寫入任何檔案
npm run scan-104 -- --max-pages 2             # 每個關鍵字最多 2 頁（較快）
npm run scan-104 -- --dry-run --max-pages 1   # 快速預覽
```

**每筆職缺輸出格式：**
```
  + 公司名稱 | 職缺標題
    地區 [遠端類型] | 薪資 | 刊登日 | 公司規模
    產業類別
    #技術標籤
```

**篩選設定**（在 `portals.yml` 的 `filter_104` 區塊設定）：

| 欄位 | 說明 |
|------|------|
| `allowed_locations` | 地區白名單（空陣列 = 不限）|
| `excluded_locations` | 地區黑名單 |
| `include_remote` | 是否納入遠端/混合工作（`remoteWorkType > 0`）|
| `min_salary_annual` | 年薪下限（`0` = 不限）|
| `accept_negotiable` | 是否收「面議」職缺 |
| `exclude_companies` | 排除特定公司（模糊比對）|
| `max_age_days` | 只收近 N 天內刊登的職缺（`0` = 不限）|
| `areas` | 104 地區代碼（API 層面過濾，減少抓取量）|

**重置掃描紀錄（讓所有職缺重新被視為新的）：**

刪除以下兩個檔案，下次執行時會自動重建：

```
data/pipeline.md
data/scan-history.tsv
```

**退出碼：** `0` 掃描完成，`1` 設定錯誤。

---

## goodjob

從 goodjob.life 批次抓取 `data/pipeline.md` 中各待處理公司的面試心得與薪資概況，輸出至 `interview-prep/goodjob/{公司名稱}.md`。快取有效期 30 天，快取存在時自動跳過，不重複請求。整個 `interview-prep/goodjob/` 目錄已加入 `.gitignore`（自動產生的快取，不進版控）。

```bash
npm run goodjob                                  # 從 pipeline.md 待處理項目批次抓取
npm run goodjob -- --company "xxx"          # 單一公司
npm run goodjob -- --force                       # 強制重抓（忽略快取）
npm run goodjob -- --dry-run                     # 只列出公司清單，不抓取
npm run goodjob -- --max-age-days 60             # 自訂快取天數（預設 30）
```

**輸出格式**（`interview-prep/goodjob-{公司}.md`）：
- 薪資概況表（職務、月薪/年薪、金額、樣本數）
- 最近 3 年面試心得，最多 3 筆（含結果、評分、年資、各段落內容）

**摘要輸出：**
```
已抓取：N | 快取：K | 無法解析：M | 失敗：F
```

**退出碼：** `0` 完成（部分失敗不影響退出碼），`1` 致命錯誤。

---

## batch104

將 `data/pipeline.md` 的待處理 104 職缺批次評估。整合兩個步驟：`pipeline-to-batch.mjs`（讀取 pending 項目 + 預抓 JD + 寫入 `batch/batch-input.tsv`）與 `batch/batch-runner.sh`（依序啟動 `claude -p` worker 評估）。

Windows 環境下自動尋找 Git Bash，無需手動設定。

```bash
npm run batch104                           # 全部 pending 職缺
npm run batch104 -- --max 20              # 只取前 20 筆
npm run batch104 -- --dry-run             # 預覽（不執行評估）
npm run batch104 -- --max 10 --parallel 2 # 10 筆，2 個 worker 並行
npm run batch104 -- --append              # 附加至現有 batch-input.tsv
```

**執行流程：**

1. **Step 1 — pipeline-to-batch.mjs**
   - 讀取 `data/pipeline.md` 的 `- [ ]` 待處理項目
   - 跳過 `batch/batch-state.tsv` 中已完成的 URL
   - 透過 `https://www.104.com.tw/job/ajax/content/{jobNo}` 預抓 JD 文字
   - 儲存至 `batch/jds/{id}.txt`
   - 寫入 `batch/batch-input.tsv`（notes 欄位填入 JD 檔案路徑）

2. **Step 2 — batch-runner.sh**
   - 讀取 `batch-input.tsv`，對每筆職缺指派報告編號
   - 啟動 `claude -p` worker，以 `batch/batch-prompt.zh.md` 作為 system prompt
   - Worker 讀取 cv.md、profile、modes/_profile.md、JD 文字，執行 A-G 評估

3. **Step 3 — Worker 輸出**
   - 評估報告：`reports/{###}-{slug}-{date}.md`
   - Tracker TSV：`batch/tracker-additions/{id}.tsv`

4. **Step 4 — merge-tracker.mjs（自動）**
   - 合併 tracker TSV → `data/applications.md`

**Batch 選項（進階，直接執行腳本）：**

若需要 `--parallel`、`--retry-failed`、`--start-from` 等選項：

```bash
node pipeline-to-batch.mjs --max 20
./batch/batch-runner.sh --parallel 2 --retry-failed
```

**退出碼：** `0` 完成，`1` pipeline-to-batch 失敗，bash 找不到時會印出提示。
