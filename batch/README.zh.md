# 批次處理

透過無頭 worker 並行處理多份職缺。每個 worker 自動執行完整評估流程（A-G 報告 + PDF + tracker 行）。各 CLI 的執行指令請參考 `AGENTS.md` 的 **Headless / Batch Mode** 表格。

## 兩種使用方式

### Mode A — Conductor（推薦）

直接告証 Claude 要批次哪個來源，Claude 用 Playwright 自動抓 URL、寫入 `batch-input.tsv`、再啟動 worker：

```
/career-ops batch  ← 然後說明要抓哪個平台或搜尋條件
```

例如：`/career-ops batch — 去 104 搜尋「前端工程師」，批次評估前 20 筆`

`batch-input.tsv` 由 Claude 自動建立，不需手動操作。

### Mode B — Standalone（已有 URL 清單時）

自行建立 `batch-input.tsv`（Tab 分隔），再執行腳本：

```tsv
id	url	source	notes
1	https://jobs.example.com/role-a	LinkedIn	
2	https://greenhouse.io/company/role-b	Greenhouse	priority
```

```bash
./batch/batch-runner.sh --dry-run   # 預覽
./batch/batch-runner.sh             # 執行
```

**結果**會在批次結束後自動透過 `merge-tracker.mjs` 合併進 `data/applications.md`，並執行 `verify-pipeline.mjs` 驗證完整性。

## 選項

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `--parallel N` | `1` | 同時執行的 worker 數量 |
| `--dry-run` | 關閉 | 預覽待處理職缺，不實際執行 |
| `--retry-failed` | 關閉 | 只重試狀態為 `failed` 的職缺 |
| `--start-from N` | `0` | 跳過 ID 小於 N 的職缺 |
| `--max-retries N` | `2` | 每筆職缺最多重試次數 |

## 目錄結構

```
batch/
  batch-runner.sh          # 協調器腳本
  batch-prompt.md          # 傳給每個 worker 的 prompt 範本
  batch-input.tsv          # 輸入職缺清單（由 npm run batch104 自動產生）
  batch-state.tsv          # 處理狀態（自動管理，支援中斷續跑）
  logs/                    # 每筆職缺的 worker 日誌（{report_num}-{id}.log）
  tracker-additions/       # worker 產出的 TSV 行
    merged/                # 已合併進 applications.md 的 TSV
```

## 運作原理

1. **batch-runner.sh** 讀取 `batch-input.tsv` 和 `batch-state.tsv`，決定哪些職缺需要處理。
2. 對每筆待處理職缺，指派報告編號並啟動無頭 worker，以 `batch-prompt.md` 作為 system prompt（`{{URL}}`、`{{REPORT_NUM}}` 等佔位符會在啟動時替換）。
3. 每個 worker 評估職缺、將報告寫入 `reports/`、PDF 寫入 `output/`、tracker TSV 寫入 `tracker-additions/`。
4. 所有 worker 完成後，呼叫 `merge-tracker.mjs` 合併 TSV 進 `data/applications.md`，並執行 `verify-pipeline.mjs` 檢查資料完整性。

## Worker 讀取的檔案

| 檔案 | 時機 |
|------|------|
| `cv.md` | 每次必讀 |
| `llms.txt` | 每次必讀（若存在）|
| `article-digest.md` | 每次必讀（proof points）|
| `templates/cv-template.html` | 產生 PDF 時 |
| `data/scan-history.tsv` | Block G 重複刊登偵測 |

## Tracker 合併

Worker 每筆職缺寫一個 TSV 至 `batch/tracker-additions/`。合併腳本（`npm run merge`）負責：

- 依公司 + 職位模糊比對及報告編號去重
- 欄位順序轉換（TSV 的 status 在 score 前；applications.md 相反）
- 重新評估分數較高時就地更新現有項目
- 將已處理的 TSV 移至 `tracker-additions/merged/`

如需在批次之外手動合併，執行 `npm run merge`。

## 中斷續跑

`batch-state.tsv` 追蹤每筆職缺的狀態（`pending`、`processing`、`completed`、`failed`）。若批次中途中斷，重新執行 `batch-runner.sh` 會從中斷處繼續——已完成的職缺自動略過。

`batch-runner.pid` 鎖定檔防止同時執行多個批次。若前次執行異常結束，系統會自動偵測並移除過期鎖定。

## /career-ops batch104 — 104 職缺批次評估

專為 `npm run scan-104` 產出的 `data/pipeline.md` 設計的批次流程，對應官方 batch Mode A 架構。

### npm run batch104 執行了什麼

```
Step 1  pipeline-to-batch.mjs
        讀 data/pipeline.md 的 - [ ] 待處理項目
        跳過 batch-state.tsv 中已完成的 URL
        寫入 batch/batch-input.tsv

Step 2  batch-runner.sh
        讀 batch-input.tsv，對每筆 URL 指派報告編號
        啟動 claude -p worker，以 batch-prompt.zh.md 作為 system prompt

Step 3  Worker（每筆 URL 獨立執行）
        必讀：cv.md、config/profile.yml、modes/_profile.md
        選讀：article-digest.md（若存在）
        執行 A-G 七個評估區塊：
          A. 職缺摘要（公司型態、年資、TL;DR）
          B. CV 匹配（JD 要求 vs 履歷證據、缺口分析）
          C. 年資與定位策略
          D. 薪資拆解（月薪、保障月數、年終、勞健保、遠端成本）
          E. 履歷與應徵客製化（Top 5 CV 調整 + keywords）
          F. 面試準備（STAR+R 故事、技術題、反問題）
          G. 職缺真實性（重複刊登、風險訊號、派遣包裝偵測）
        輸出：reports/{###}-{slug}-{date}.md
        輸出：batch/tracker-additions/{id}.tsv

Step 4  merge-tracker.mjs（自動）
        合併 tracker-additions/ → data/applications.md
        執行 verify-pipeline.mjs 驗證完整性
```

### 完整指令

```bash
npm run scan-104                           # 掃描 104，寫入 pipeline.md
npm run batch104                           # 全部 pending → 評估
npm run batch104 -- --max 20               # 只取前 20 筆
npm run batch104 -- --dry-run              # 預覽，不執行
npm run batch104 -- --max 20 --parallel 2  # 前 20 筆，2 個 worker 並行
npm run batch104:test                      # 單跑 1 筆（功能驗證用）
```

跨平台（Windows / macOS / Linux）均可直接執行，自動尋找 Git Bash。

或透過對話框引導：

```
/career-ops batch104
```

Claude 會詢問批次數量、呼叫 `pipeline-to-batch.mjs`、執行 `batch-runner.sh`，並在結束後顯示摘要。

### batch104:test — 單筆驗證

首次設定或改動評估邏輯後，先跑單筆確認整條管道正常：

```bash
npm run batch104:test
```

完成後確認以下四點：

| 項目 | 確認方式 |
|------|----------|
| JD 成功抓取 | `batch/jds/{id}.txt` 有內容，無 `[object Object]` |
| 評估報告產出 | `reports/{###}-{slug}-{date}.md` 存在 |
| 報告語言正確 | 繁體中文，非西班牙文或加泰隆尼亞文 |
| Tracker TSV 寫入 | `batch/tracker-additions/{id}.tsv` 存在 |

確認通過後再執行完整批次 `npm run batch104`。

### batch104 選項

| 參數 | 說明 |
|------|------|
| `--max N` | 只取前 N 筆（預設全部）|
| `--dry-run` | 預覽，不寫入任何檔案 |
| `--append` | 附加至現有 batch-input.tsv，不覆蓋 |

若需要 `batch-runner.sh` 的進階選項（`--parallel`、`--retry-failed`），直接執行：

```bash
node pipeline-to-batch.mjs --max 20
./batch/batch-runner.sh --parallel 2
```

### 重置批次狀態

若需從頭重跑（清除所有暫存但保留 reports 和 applications.md）：

```bash
npm run batch:reset              # 執行清除
npm run batch:reset -- --dry-run # 預覽會刪什麼
npm run batch104:test            # 重置後單跑 1 筆驗證
```

清除項目：`batch-input.tsv`、`batch-state.tsv`、`batch/jds/*.txt`、`batch/logs/*.log`

### 注意事項

- 已在 `batch-state.tsv` 完成的 URL 自動略過，不重複評估
- `batch-input.tsv`、`batch-state.tsv`、`batch/jds/` 已加入 `.gitignore`，不進版控
- 若要重試失敗項目：`./batch/batch-runner.sh --retry-failed`

---

## 前置需求

- CLI 已加入 PATH（參考 `AGENTS.md` 的 **Headless / Batch Mode** 表格）
- Node.js >= 18、Playwright Chromium 已安裝（執行 `npm run doctor` 驗證）
- `batch-input.tsv` 至少有一筆職缺（透過 `npm run batch104` 自動產生）
