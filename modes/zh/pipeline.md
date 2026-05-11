# 模式：台灣職缺 Pipeline

處理 `data/pipeline.md` 中待評估的職缺 URL。

## 流程

1. 讀取 `data/pipeline.md`
2. 找出 `Pending` 或中文「待處理」區塊中的 `- [ ]` 項目
3. 對每個 URL 擷取 JD
4. 執行 `modes/zh/oferta.md` 評估
5. 需要時產生履歷 PDF
6. 寫 tracker TSV
7. 移到已處理區
8. 批次結束後執行 `node merge-tracker.mjs`

## URL 擷取優先順序

1. Playwright：104、CakeResume、Yourator、Meet.jobs、公司 SPA
2. WebFetch：靜態頁
3. 使用者貼 JD：登入或反爬造成無法讀取時

LinkedIn 或 104 有時需要登入。如果無法讀取，請使用者貼上 JD 文字。

## pipeline.md 格式

```markdown
## Pending

### 台北市大安區
- [ ] https://www.104.com.tw/job/... | 公司名稱 | 職缺標題 | 台北市大安區 | 2026-05-11

### 新北市新店區
- [ ] https://www.cakeresume.com/companies/.../jobs/... | Company | Role | 新北市新店區 | 2026-05-10

## Processed
- [x] #001 | URL | Company | Role | 4.2/5 | PDF yes
```

欄位順序：URL | 公司 | 職缺 | 地點 | 刊登日。`### 地區` 為分群標題，讀取時略過，只處理 `- [ ]` 項目。

## 批次摘要

```markdown
| # | 公司 | 職缺 | 分數 | PDF | 建議 |
|---|------|------|------|-----|------|
```

低於 4.0 的職缺要明確標示是否不建議投。
