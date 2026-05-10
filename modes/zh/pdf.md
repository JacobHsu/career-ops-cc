# 模式：中文 / 中英履歷 PDF

依照台灣職缺產生 ATS 友善履歷。

## 語言策略

- 中文 JD：繁中履歷或中英混合履歷
- 中英混合 JD：中英混合履歷
- 英文 JD 或外商 ATS：英文履歷
- 技術詞保留英文，不硬翻 React、Vue、API、Dashboard、Full-stack

## 流程

1. 讀 `cv.md`
2. 讀 `config/profile.yml`
3. 讀 `modes/_profile.md`
4. 讀 JD
5. 抽出 15-20 個 keyword
6. 選擇語言與 A4 格式
7. 重寫 Summary
8. 選出最相關 3-4 個專案
9. 依 JD 重排經歷 bullet
10. 自然加入 keyword
11. 用 `templates/cv-template.html` 產生 HTML
12. 執行 `node generate-pdf.mjs`

## 台灣履歷重點

優先呈現：

- React / Vue / Frontend / Full-stack 經驗
- 產品開發與 dashboard/admin 系統
- ESG AI、DeFi、LearnMode、登山救難平台等 proof points
- 作品集與 GitHub
- 可讀的技術棧

## 禁止

- 編造量化成果
- 加入沒用過的技術
- 把 side project 包裝成正式工作
- 過度使用空泛詞：積極、負責、抗壓、熱情

## 輸出

檔名：

`output/cv-{candidate}-{company}-{YYYY-MM-DD}.pdf`

台灣市場預設 A4。
