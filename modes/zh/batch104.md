# 模式：批次評估 104 職缺（batch104）

批次處理 `data/pipeline.md` 中來自 104.com.tw 的待評估職缺，對齊官方 batch Mode A 架構：pipeline.md 作為 Conductor 輸出，`batch-runner.sh` 負責 worker 執行。

## 執行流程

### Step 1 — 確認來源

讀取 `data/pipeline.md`，計算 `- [ ]` 待處理項目數量。若為 0，提示用戶先執行 `npm run scan-104`。

### Step 2 — 詢問批次數量

```
pipeline.md 目前有 {N} 筆待評估職缺。
要批次評估幾筆？（預設 20，輸入 all 處理全部）
```

### Step 3 — 產生 batch-input.tsv

執行：

```bash
node pipeline-to-batch.mjs --max {N}
```

若用戶選 all：

```bash
node pipeline-to-batch.mjs
```

確認輸出：`batch/batch-input.tsv` 已建立，顯示筆數。

### Step 4 — 預覽並確認

```bash
./batch/batch-runner.sh --dry-run
```

列出即將處理的職缺清單，請用戶確認後繼續。

### Step 5 — 執行批次

```bash
./batch/batch-runner.sh
```

若用戶想要並行加速（需 Claude Max）：

```bash
./batch/batch-runner.sh --parallel 2
```

### Step 6 — 完成摘要

批次結束後 `batch-runner.sh` 已自動執行 `merge-tracker.mjs`。顯示：

- 已評估：N 筆
- 平均分數：X.X/5
- 報告位置：`reports/`
- 建議下一步：查看高分職缺（`/career-ops tracker`）

## 錯誤處理

| 狀況 | 處理方式 |
|------|----------|
| pipeline.md 無待處理項目 | 提示執行 `npm run scan-104` |
| batch-runner.sh 不存在 | 提示 `chmod +x batch/batch-runner.sh` |
| claude CLI 不在 PATH | 提示安裝並確認 `which claude` |
| 部分 worker 失敗 | 執行完後提示用 `--retry-failed` 重試 |

## 注意事項

- `batch-input.tsv` 已在 `.gitignore` — 不進版控
- 已完成的 URL（`batch-state.tsv` 中 status=completed）自動略過，不重複評估
- 若要附加新職缺到現有批次：`node pipeline-to-batch.mjs --max N --append`
