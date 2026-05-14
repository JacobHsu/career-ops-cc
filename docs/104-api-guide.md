# 104.com.tw 資料抓取技術文件

> **注意**：本文件描述的所有 API 均為**非官方、逆向工程**所得。這些是 104 前端 SPA 在執行時呼叫的內部端點，104 從未公開文件，隨時可能改版或封鎖。

> 本文件說明 career-ops 如何透過 104 內部 API 抓取職缺資料，涵蓋端點細節、請求格式、回應結構、篩選邏輯與錯誤處理。

---

## 概覽

career-ops 對 104 的所有資料存取均為**直接 API 呼叫**，不使用 Playwright 瀏覽器、不消耗 WebSearch/LLM token。

| 腳本 | 用途 | 場景 |
|------|------|------|
| `scan-104.mjs` | 批次搜尋，將新職缺寫入 pipeline | 定期掃描、自動發現新職缺 |
| `fetch-jd.mjs` | 單一職缺完整 JD + 公司資料 | 評估前預抓、批次前置作業 |
| `pipeline-to-batch.mjs` | 批次前置：從 pipeline 批量預抓 JD | 批次評估（`npm run batch104`）|

---

## 使用的 API 端點

### 1. 職缺搜尋 API（`scan-104.mjs`）

```
GET https://www.104.com.tw/jobs/search/api/jobs
```

**Query 參數：**

| 參數 | 說明 | 範例 |
|------|------|------|
| `keyword` | 搜尋關鍵字 | `AI工程師` |
| `page` | 頁碼（從 1 開始）| `1` |
| `ro` | 結果模式（`0` = 全部）| `0` |
| `order` | 排序（`15` = 符合度）| `15` |
| `asc` | 升冪/降冪（`0` = 降冪）| `0` |
| `mode` | 搜尋模式（`s` = 標準）| `s` |
| `area` | 地區代碼，逗號分隔（選填）| `6001001000,6001002000` |
| `jobcat` | 職務類別代碼，逗號分隔（選填）| `2007001015,2007001017` |

**回應結構：**

```json
{
  "data": [
    {
      "jobNo": "8xxxxx",
      "jobName": "AI 工程師",
      "custName": "某某科技股份有限公司",
      "jobAddrNoDesc": "台北市信義區",
      "salaryDesc": "月薪 60,000~90,000 元",
      "salaryLow": 60000,
      "salaryHigh": 90000,
      "appearDate": "20260514",
      "remoteWorkType": 1,
      "coIndustryDesc": "電腦軟體服務業",
      "employeeCount": 120,
      "applyCnt": 18,
      "pcSkills": [{ "description": "Python" }],
      "optionEdu": [3],
      "link": { "job": "https://www.104.com.tw/job/8xxxxx?..." }
    }
  ],
  "metadata": {
    "pagination": { "lastPage": 12 }
  }
}
```

**地區代碼常用值：**

| 代碼 | 地區 |
|------|------|
| `6001001000` | 台北市 |
| `6001002000` | 新北市 |
| `6001003000` | 桃園市 |

**職務類別代碼常用值：**

| 代碼 | 職類 |
|------|------|
| `2007001015` | 前端工程師 |
| `2007001017` | 全端工程師 |
| `2007001000` | 軟體工程師（大類）|
| `2007001016` | 後端工程師 |

> 完整代碼參考：[area 代碼表](https://github-wiki-see.page/m/Li732375/JobE04_spider/wiki/Payload-參數_地區（area）) · [jobcat 代碼表](https://github.com/Li732375/JobE04_spider/wiki/Payload-參數_職務類別（jobcat）)

---

### 2. 職缺詳細內容 API（`fetch-jd.mjs`）

```
GET https://www.104.com.tw/job/ajax/content/{jobNo}
```

**必要 Headers：**

```http
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...Chrome/131...
Referer: https://www.104.com.tw/job/{jobNo}
Accept: application/json, text/html, */*
Accept-Language: zh-TW,zh;q=0.9,en;q=0.8
X-Requested-With: XMLHttpRequest
```

> `Referer` 與 `X-Requested-With` 是必要的；缺少 `Referer` 會導致 403 或回傳 HTML 而非 JSON。

**回應結構（`data` 欄位）：**

```json
{
  "header": {
    "jobName": "AI 工程師",
    "custName": "某某科技",
    "custUrl": "https://www.104.com.tw/company/abc123"
  },
  "jobDetail": {
    "jobDescription": "<p>工作內容 HTML...</p>",
    "addressRegion": "台北市",
    "addressArea": "信義區",
    "addressDetail": "某某路100號",
    "salaryMin": 60000,
    "salaryMax": 90000
  },
  "condition": {
    "other": "<p>條件要求 HTML...</p>"
  },
  "welfare": {
    "welfare": "<p>福利制度 HTML...</p>"
  },
  "custNo": "abc123",
  "industry": "電腦軟體服務業",
  "employees": "100~500人"
}
```

**此端點同時被 `pipeline-to-batch.mjs` 使用**，在批次評估前以相同方式預抓 JD 文字，存至 `batch/jds/{id}.txt`。

---

### 3. 公司官網（選填補充）

`fetch-jd.mjs` 若在 JD 文字或 `custUrl` 中找到外部 URL，會額外 fetch 公司官網：

- 擷取 `og:description` 或 `meta[name=description]`
- 解析 JSON-LD（`name`、`description`）
- 擷取 `<h1-4>` / `<p>` 的有意義段落（30–400 字元，非版權/cookie 文字）

這是**盡力而為**的補充，失敗不影響主流程。

---

## 資料流

```
portals.yml
    ↓  keywords / areas / jobcats
scan-104.mjs
    → GET /jobs/search/api/jobs (逐頁、逐關鍵字)
    → 篩選（標題、地點、薪資、公司、日期）
    → 去重（scan-history.tsv + pipeline.md + applications.md）
    → data/pipeline.md（新職缺）
    → data/scan-history.tsv（歷史紀錄）
              ↓
pipeline-to-batch.mjs（batch104 前置）
    → GET /job/ajax/content/{jobNo}（批量預抓 JD）
    → batch/jds/{id}.txt
    → batch/batch-input.tsv
              ↓
fetch-jd.mjs（單一職缺，手動或 coverletter 自動觸發）
    → GET /job/ajax/content/{jobNo}
    → fetch 公司官網（選填，JD 文字中有外部 URL 時才執行）
    → jds/{jobNo}.md
```

---

## 請求設計：防封鎖措施

### User-Agent 輪換（`scan-104.mjs`）

掃描器維護 4 組真實瀏覽器 UA，每次請求隨機選取：

```js
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/131 ...',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ... Chrome/131 ...',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ... Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) ... Chrome/131 ...',
];
```

### 請求間隔（`scan-104.mjs`）

每個關鍵字結束後，隨機等待 1.5–3.5 秒：

```js
const MIN_SLEEP_MS = 1500;
const MAX_SLEEP_MS = 3500;
```

同一關鍵字的翻頁之間亦有相同間隔。

### 逾時設定

| 腳本 | 一般請求逾時 | 官網請求逾時 |
|------|------------|------------|
| `fetch-jd.mjs` | 15 秒 | 10 秒 |
| `scan-104.mjs` | 20 秒 | — |

逾時使用 `AbortController`，不依賴 Node.js `fetch` 的 keepAlive 行為。

---

## 篩選邏輯（`scan-104.mjs`）

篩選設定來自 `portals.yml` 的 `filter_104` 區塊。篩選在本地執行，**不影響 API 請求數**（`area`/`jobcat` 除外，這兩個是 API 層面過濾）。

### 標題篩選（`title_filter`）

```yaml
title_filter:
  positive: ["工程師", "developer", "engineer"]   # 至少符合一個（不分大小寫）
  negative: ["業務", "行銷", "資深主任"]            # 符合任何一個則排除
```

兩者皆以小寫進行 `includes()` 比對。

### 地點篩選

```yaml
filter_104:
  allowed_locations: ["台北市", "新北市"]   # 空陣列 = 不限
  excluded_locations: ["桃園市"]
  include_remote: true  # remoteWorkType > 0 的職缺跳過地點檢查
```

遠端職缺（`remoteWorkType: 1` 或 `2`）若 `include_remote: true`，則**繞過** `allowed_locations` 限制，但仍受 `excluded_locations` 約束。

### 薪資篩選

```yaml
filter_104:
  min_salary_annual: 800000   # 年薪下限
  min_monthly_salary_max: 50000   # 月薪上限下限（過濾薪水天花板太低的職缺）
  accept_negotiable: true     # 是否接受「面議」
```

月薪判斷邏輯：若薪資上限數字 < 200,000 則視為月薪，否則視為年薪。

### 日期篩選

```yaml
filter_104:
  max_age_days: 30  # 只收近 30 天內刊登的職缺（0 = 不限）
```

以 `appearDate`（YYYYMMDD 格式）與 cutoff 日期做字串比對。

### 公司排除

```yaml
filter_104:
  exclude_companies: ["人力派遣", "某某獵頭"]  # 模糊比對，不分大小寫
```

---

## 去重機制（`scan-104.mjs`）

掃描結束前，對以下三個來源做 URL Set 去重：

1. `data/scan-history.tsv`（第一欄為 URL）
2. `data/pipeline.md`（正則匹配 `- [x] https://...` 格式）
3. `data/applications.md`（正則匹配所有 `https://` URL）

同一掃描批次內，以 `jobNo` 去重（跨關鍵字的重複職缺只計一次）。

---

## HTML 清理（`stripHtml`）

104 JD 欄位（`jobDescription`、`condition.other`、`welfare.welfare`）均為 HTML，在存入 Markdown 前透過純字串替換清理：

```
<br> → \n
<p>, <div>, <li>, <tr> → \n（前後各加換行）
所有其他標籤 → 移除
&nbsp; → 空格
&amp; → &
&lt;/&gt; → </>
連續空白 → 單一空格
連續換行 > 2 → 兩個換行
```

無 DOM 依賴，純 `String.replace()`，在 Node.js 無頭環境可用。

---

## 輸出格式

### `jds/{jobNo}.md`（`fetch-jd.mjs` 輸出）

```markdown
# 職位名稱 — 公司名稱

**職缺 URL**: https://www.104.com.tw/job/{jobNo}
**公司頁面**: https://www.104.com.tw/company/{custNo}
**地點**: 台北市信義區（某某路100號）
**薪資**: 60,000～90,000 元
**抓取日期**: 2026-05-14

## 工作內容
...

## 條件要求
...

## 福利制度
...

## 公司簡介

**產業**: 電腦軟體服務業
<!-- 請自行補充公司介紹 -->

## 主要商品 / 服務項目

*以下摘自公司官網：*（僅 JD 含外部 URL 且抓取成功時出現）
- ...
```

### `data/pipeline.md` 新增格式（`scan-104.mjs` 輸出）

```
- [ ] https://www.104.com.tw/job/{jobNo} | 公司名稱 | 職缺標題 [混合遠端] | 台北市信義區 | 2026-05-14
```

依地點分群（台北市優先），同群內依刊登日降冪排序。

### `data/scan-history.tsv` 欄位

```
url  appear_date  portal  title  company  location  remote  salary  industry  status  first_seen
```

---

## 錯誤處理

| 情境 | 行為 |
|------|------|
| Job Detail API 回傳非 JSON | 拋出錯誤，印出提示：建議手動複製 JD 貼入 `/career-ops oferta` |
| HTTP 4xx/5xx | 拋出錯誤並終止（`fetch-jd.mjs`）/ 繼續下一關鍵字（`scan-104.mjs`）|
| 公司官網 fetch 失敗 | 靜默失敗，略過 `## 主要商品 / 服務項目` 區塊 |
| `AbortController` 逾時 | 同上，視為 fetch 失敗 |

批次模式（`pipeline-to-batch.mjs`）中，單一職缺 JD 抓取失敗不中斷整批，僅跳過該筆並記錄。

---

## 關鍵常數

| 常數 | 腳本 | 值 | 說明 |
|------|------|----|------|
| `FETCH_TIMEOUT_MS` | `fetch-jd.mjs` | 15,000 ms | 一般 API 逾時 |
| `FETCH_TIMEOUT_MS` | `scan-104.mjs` | 20,000 ms | 搜尋 API 逾時 |
| `MIN_SLEEP_MS` | `scan-104.mjs` | 1,500 ms | 請求間最短等待 |
| `MAX_SLEEP_MS` | `scan-104.mjs` | 3,500 ms | 請求間最長等待 |
| `DEFAULT_MAX_PAGES` | `scan-104.mjs` | 5 | 每個關鍵字預設最大頁數 |
| `API_URL` | `scan-104.mjs` | `https://www.104.com.tw/jobs/search/api/jobs` | 搜尋端點 |

---

## 快速參考：npm 指令

```bash
# 單一職缺 JD 抓取
npm run fetch104 -- https://www.104.com.tw/job/{jobNo}

# 批次搜尋掃描
npm run scan-104                              # 正式執行
npm run scan-104 -- --dry-run                # 預覽，不寫入
npm run scan-104 -- --max-pages 2            # 限制頁數

# 批次評估（包含預抓 JD）
npm run batch104
npm run batch104 -- --max 20 --dry-run
```

---

## 相關檔案

| 路徑 | 說明 |
|------|------|
| `fetch-jd.mjs` | 單一 JD 抓取主程式 |
| `scan-104.mjs` | 批次掃描主程式 |
| `pipeline-to-batch.mjs` | 批次前置，呼叫 Job Detail API |
| `portals.yml` | 關鍵字、地區代碼、篩選設定 |
| `jds/` | JD Markdown 輸出目錄 |
| `data/pipeline.md` | 待評估職缺 inbox |
| `data/scan-history.tsv` | 掃描歷史（去重用）|
| `data/scan-history.md` | 掃描歷史可讀版 |
| `batch/jds/` | 批次前置抓取的 JD 文字（gitignored）|
