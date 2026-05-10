# 模式：台灣平台掃描

掃描 `portals.yml` 中設定的平台與公司，找出新職缺並加入 `data/pipeline.md`。

## 主要來源

- 104
- CakeResume
- Yourator
- Meet.jobs
- LinkedIn Taiwan
- 公司官網
- 外商 ATS：Greenhouse、Ashby、Lever、Workday

## 關鍵字

中文：

- 前端工程師
- 資深前端工程師
- Frontend
- React
- Vue
- 全端工程師
- 資深全端工程師
- Full-stack
- 軟體工程師

英文：

- Senior Frontend Engineer
- Frontend Engineer
- React Engineer
- Vue Engineer
- Full-stack Engineer
- Software Engineer, Frontend
- Product Engineer

排除：

- 工讀
- 實習
- Junior
- 網頁設計師純設計
- UI/UX 無工程內容
- 派遣
- 駐點
- 博弈，如果使用者不接受

## 掃描流程

1. 讀 `portals.yml`
2. 讀 `data/scan-history.tsv`
3. 讀 `data/applications.md` 和 `data/pipeline.md` 去重
4. 對每個來源找出職稱、公司、URL
5. 用 title_filter 過濾
6. 對 WebSearch 結果用 Playwright 驗證是否仍有效
7. 新職缺加入 `data/pipeline.md`
8. 所有看過的 URL 記錄到 `data/scan-history.tsv`

## 104 注意事項

- 104 有時需要登入或有動態內容，優先用 Playwright
- 薪資可能寫月薪、年薪、面議
- 注意「接受身份」與「工作待遇」
- 公司頁與職缺頁都可能有重要資訊

## CakeResume 注意事項

- 常見新創與外商職缺
- 英文與中文 JD 混合
- 注意遠端限制與公司地點

## Yourator / Meet.jobs 注意事項

- 新創與成長型公司較多
- 注意是否為早期新創、薪資透明度、股權說法

## 輸出摘要

```text
Taiwan Portal Scan -- {YYYY-MM-DD}

掃描來源：N
找到職缺：N
通過篩選：N
重複：N
失效：N
新增到 pipeline：N

+ {company} | {title} | {source}
```
