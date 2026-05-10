# 模式：職缺評估

當使用者貼上 JD 或職缺 URL，輸出 A-G 七個區塊，並保存 report 與 tracker TSV。

## A. 職缺摘要

| 欄位 | 內容 |
|------|------|
| 公司 | 公司名稱 |
| 職稱 | 原始職稱 |
| 角色分類 | 依 `_shared.md` 與 `_profile.md` 判斷 |
| 地點 | 遠端 / 混合 / 到辦 / 城市 |
| 年資 | Mid / Senior / Lead / Staff |
| 公司型態 | 產品 / SI / 接案 / 派遣 / 駐點 / 外商 / 新創 |
| TL;DR | 一句話判斷 |

## B. CV 匹配

讀 `cv.md`、`config/profile.yml`、`modes/_profile.md`。

| JD 要求 | 履歷證據 | 匹配度 | 備註 |
|---------|----------|--------|------|

缺口分析：

1. 是否硬性門檻？
2. 是否有相鄰經驗可補？
3. 是否可用作品集或 side project 補強？
4. 應徵信或面試中怎麼講？

不可編造技能或數字。

## C. 年資與定位策略

說明：

- JD 的實際年資要求
- 候選人的自然定位
- 如何「賣 senior 但不誇大」
- 如果被 downlevel，應接受或談判的條件
- 第一輪 recruiter screen 要主打的 2-3 個訊號

## D. 薪資與市場

台灣職缺必須拆解：

- 月薪或年薪
- 保障年薪幾個月
- 年終、績效、分紅、股票
- 勞健保、勞退、特休
- 遠端/混合造成的通勤成本
- 正職、約聘、派遣、接案差異

可參考來源：

- 104 薪資情報
- CakeResume
- Yourator
- Meet.jobs
- LinkedIn Taiwan
- 公司 JD 公開薪資
- 同類職缺薪資區間

如果無法查到可靠資料，明確寫「資料不足」。

## E. 履歷與應徵客製化

| # | 區塊 | 現況 | 建議調整 | 原因 |
|---|------|------|----------|------|

列出：

- Top 5 CV 調整
- Top 5 自我推薦 / LinkedIn / 作品集調整
- JD keyword
- 中文或中英混合措辭建議

## F. 面試準備

準備 6-10 個 STAR+R 故事：

| # | JD 要求 | 故事 | S | T | A | R | Reflection |
|---|---------|------|---|---|---|---|------------|

另外包含：

- 最適合展示的作品
- 可能技術題
- 可能被問的風險問題
- 候選人應該反問公司的問題

## G. 職缺真實性與風險

判斷職缺是否值得投入時間。

| 訊號 | 發現 | 權重 |
|------|------|------|

觀察：

- 職缺發布時間
- Apply 是否可用
- JD 是否具體
- 是否長期重貼
- 是否像派遣/駐點/SI 包裝
- 是否有薪資資訊
- 公司是否近期裁員或停止招募

結論只能用：

- `High Confidence`
- `Proceed with Caution`
- `Suspicious`

## 評分

使用 1-5 分：

- 4.5+：強烈建議投
- 4.0-4.4：值得投
- 3.5-3.9：可投但要有理由
- 3.5 以下：建議不投，除非使用者有特殊考量

低於 4.0 要明確說是否建議不要投。

## 保存 Report

存到：

`reports/{###}-{company-slug}-{YYYY-MM-DD}.md`

Header 必須包含：

```markdown
# Evaluation: {Company} -- {Role}

**Date:** {YYYY-MM-DD}
**Archetype:** {detected}
**Score:** {X.X/5}
**URL:** {job URL}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**PDF:** {path or pending}
```

## Tracker

新增評估不要直接編輯 `data/applications.md`。寫入：

`batch/tracker-additions/{num}-{company-slug}.tsv`

格式：

```text
{num}\t{date}\t{company}\t{role}\tEvaluated\t{score}/5\t{pdf_emoji}\t[{num}](reports/{num}-{slug}-{date}.md)\t{note}
```

然後執行：

```bash
node merge-tracker.mjs
```
