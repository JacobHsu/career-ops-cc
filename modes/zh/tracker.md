# 模式：追蹤表

讀取並摘要 `data/applications.md`。

## 狀態

狀態欄只使用英文 canonical states：

- `Evaluated`
- `Applied`
- `Responded`
- `Interview`
- `Offer`
- `Rejected`
- `Discarded`
- `SKIP`

中文說明放在 Notes，不放在 Status。

## 顯示內容

- 總職缺數
- 各狀態數量
- 平均分數
- 已產 PDF 比例
- 已有 report 比例
- 建議下一步

## 更新規則

可以更新既有 row 的狀態或 Notes。

新增 row 必須透過：

1. `batch/tracker-additions/*.tsv`
2. `node merge-tracker.mjs`
