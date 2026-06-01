# /career-ops coverletter — 104 推薦信產生器

針對 104 應徵頁面「自我介紹」欄位產生繁體中文推薦信。

**檔案驅動**：所有資料事先放在固定路徑，指令只負責讀檔產出。不在對話中貼 JD 或臨時補資料。

---

## 使用前準備（資料放對位置）

| 資料 | 必須放這 | 如何取得 |
|------|---------|---------|
| **繁中履歷** | `cv.zh.md` | 一次寫好，長期重用 |
| **JD（職缺描述）** | `jds/{jobNo}.md` | `npm run fetch104 -- https://www.104.com.tw/job/{jobNo}` |
| **個人化設定** | `config/profile.yml` + `modes/_profile.md` | onboarding 時建立 |
| **過去推薦信（選）** | `examples/coverletter/past-letters.md` | 累積過去寫過的推薦信，延續文風 |
| **公司評估（選）** | `reports/{num}-{slug}-{date}.md` | `/career-ops oferta` 產出 |

**輸出位置**：新產出寫入 `output/coverletters/{jobNo}-{date}.md`（**只寫不讀**，不作參考來源）

**缺檔處理**：
- `cv.zh.md` / `jds/{jobNo}.md` / profile 缺 → 停止並提示
- past-letters / reports 缺 → 略過、不影響執行

---

## 使用方式

### 互動模式（`/career-ops coverletter`）

```
/career-ops coverletter https://www.104.com.tw/job/8xxxxx
/career-ops coverletter 8xxxxx
```

**只接受 URL 或 jobNo。** 不再支援「貼 JD 文字」或「公司+職稱」。

Claude 會：

1. **先顯示前置 checklist**（讓你親眼確認資料齊全才開始寫）：

   ```
   == 推薦信前置檢查（jobNo: 8xxxxx）==

   必要檔案：
     [✅] cv.zh.md
     [✅] jds/8xxxxx.md
     [✅] config/profile.yml
     [✅] modes/_profile.md

   選用檔案（影響品質）：
     [✅] examples/coverletter/past-letters.md
     [✅] output/coverletters/（過去 3 篇可參考）
     [—] reports/（無對應評估報告）
     [—] article-digest.md
   ```

2. 任何必要 ❌ → **立刻停止**並給修補指令（不會繼續往下做）
3. 全部 ✅ → 讀取資料 → 產出 → 寫入 `output/coverletters/{jobNo}-{YYYY-MM-DD}.md` + 對話顯示

### 批次模式（`npm run coverletter`）

```bash
npm run coverletter -- https://www.104.com.tw/job/8xxxxx
npm run coverletter -- 8xxxxx
npm run coverletter -- local:jds/8xxxxx.md
```

呼叫 `claude -p` 開獨立子進程，不污染主對話 context。

**JD 缺檔時批次模式會自動跑 fetch-jd**，互動模式不會（避免靜默副作用）。

| 模式對比 | 互動 `/career-ops coverletter` | 批次 `npm run coverletter` |
|---|---|---|
| 入口 | `modes/zh/coverletter.md` | `coverletter.mjs` → `batch/coverletter-prompt.zh.md` |
| 執行者 | 當前 Claude session | 新開 `claude -p` 子進程 |
| Context | 共用主對話 | 獨立、無歷史 |
| 互動 | 可問問題、改段落 | 一次性輸出 |
| JD 缺檔 | 停止並提示 | 自動 fetch-jd |
| Token 計費 | 算在主對話 | 子進程獨立計 |
| 輸出位置 | `output/coverletters/` + 對話顯示 | `output/coverletters/` |

---

## 資料來源（讀取順序）

兩種模式讀取完全相同的來源，順序如下：

1. **必讀（缺即停止）**
   - `cv.zh.md` — 經歷與數字的唯一來源
   - `jds/{jobNo}.md` — JD 結構化資料
   - `config/profile.yml` + `modes/_profile.md` — 個人化設定

2. **若存在則讀（影響文風）**
   - `examples/coverletter/past-letters.md` — 過去寫過的推薦信彙整
     - 用途：延續你過去滿意的句法、開頭、收尾節奏
     - **只學語感，不複製內容**

3. **若存在則讀（補充內容）**
   - `reports/{num}-*.md` — 該公司的評估報告（fit 分析）
   - `article-digest.md` — 補充 proof points

---

## 流程細節

### 互動模式

```
/career-ops coverletter https://www.104.com.tw/job/8xxxxx
   ↓
[Step 0] 嚴格前置條件檢查（缺檔即停止）
   ├─ cv.zh.md 存在？
   ├─ jds/8xxxxx.md 存在？（不存在 → 提示先跑 fetch-jd）
   └─ config/profile.yml + modes/_profile.md 存在？
   ↓
[Step 1] 讀 jds/8xxxxx.md → 擷取公司名、職稱、職責、技能
[Step 2] 讀 cv.zh.md + profile
[Step 3] 讀 examples/coverletter/past-letters.md（若有）
[Step 4] 讀 reports/ 對應該公司的評估報告（若有）
   ↓
[Step 5] 依 CAR 框架產出 4 段、250–350 字
[Step 6] 寫入 output/coverletters/8xxxxx-{date}.md
[Step 7] 對話顯示 + 列出實際讀到的來源 + 需確認處
```

### 批次模式

```
npm run coverletter -- https://www.104.com.tw/job/8xxxxx
   ↓
coverletter.mjs：
[1] 解析輸入（URL / jobNo / local:jds/xxx.md）
[2] 檢查 cv.zh.md 存在
[3] 檢查 jds/{jobNo}.md → 不存在則 spawnSync('fetch-jd.mjs')
[4] 確認 batch/coverletter-prompt.zh.md 存在
[5] 建立 output/coverletters/ 目錄
   ↓
spawnSync('claude', ['-p', '--allowedTools', 'Read,Write'])
   ↓
傳入 prompt（workerInstructions + 任務指示）
   ↓
Worker Claude：讀同一份資料來源 → 寫 output/coverletters/{jobNo}-{date}.md
   ↓
coverletter.mjs 確認檔案存在 → 完成
```

---

## 信件結構（CAR 框架）

固定 4 段、250–350 字、繁體中文：

**第一段（定位，2–3 句）**
- 我是誰、幾年資歷、核心專長
- 點出與這個職缺最直接相關的一個身份

**第二段（匹配，3–4 句）— CAR 框架**
- **C**（情境）：在 {公司/專案} 期間，面對 {具體挑戰}
- **A**（行動）：採用 {技術/方法}，負責 {具體工作}
- **R**（成果）：最終 {可驗證的結果}
- 來源只能是 cv.zh.md，不可編造

**第三段（動機，2–3 句）**
- 為什麼對這家公司或職位有興趣
- 必須呼應 JD 原文詞彙（產品、技術方向、業務特性）

**第四段（收尾，1–2 句）**
- 期待進一步說明
- 禁套用「感謝您百忙中撥冗閱讀」「敬請惠予機會」

---

## 語氣守則

- 直接、專業，不誇大
- 技術詞彙保留英文（React、CI/CD、LLM 等）
- **禁用詞彙**：熱愛學習、積極主動、抗壓性高、自我驅動、團隊合作佳、貴公司深感興趣、貴公司在業界享有盛名
- 不用第一人稱「我」開頭每一句
- 避免翻譯腔
- 具體數字優先（「3 人團隊」比「小團隊」有力）

---

## 輸出格式

寫入 `output/coverletters/{jobNo}-{YYYY-MM-DD}.md`：

```
## {Company} {Role} — 推薦信

{信件正文，直接可複製}

---
字數：{N} 字
來源：cv.zh.md + jds/{jobNo}.md（+ examples + 過去 N 篇 + report {num}，視實際讀到的列出）
需確認：{如有空白或不確定處，列於此}
```

---

## 學習迴路（兩層）

### 第一層：自動延續文風

每次跑 coverletter，會自動讀 `output/coverletters/` 最近 3 篇——你不必做任何事，文風自然延續。

### 第二層：手動精選範本

當你產出一封特別滿意的信，把正文貼到 `examples/coverletter/past-letters.md` 的 Part B 最下面：

```
### 範例 N
職缺類型：{例：全端工程師}

{推薦信正文}

---
```

Part B 是「精選範本」，比 `output/coverletters/` 整批讀更權威。

---

## 常見問題

**Q: 為什麼不能在對話中貼 JD？**
A: 設計刻意。檔案驅動讓兩條路徑（互動 / 批次）行為一致，也避免 JD 散落在對話中、下次找不到。所有 JD 都該透過 `npm run fetch104` 抓進 `jds/`。

**Q: 我臨時要寫一封但沒抓 JD 怎麼辦？**
A: 先 `npm run fetch104 -- {URL}`，再 `/career-ops coverletter {URL}`。或者直接用批次模式，它會自動 fetch-jd。

**Q: 過去推薦信會被無限讀嗎？**
A: 不會，只讀最近 3 篇（按檔名日期降序）。

**Q: 過去推薦信會被複製進新信嗎？**
A: 不會，prompt 明確規定「只學語感、不複製內容」。

**Q: 想針對某段重寫怎麼辦？**
A: 互動模式直接說「第二段太長」「第三段強調 AI 經驗」即可。批次模式需重跑。

**Q: 範本檔可以手動編輯嗎？**
A: 可以，編輯 `examples/coverletter/past-letters.md` 的 Part B，加在最下面。

---

## 相關檔案

| 路徑 | 角色 |
|------|------|
| `modes/zh/coverletter.md` | 互動模式（slash command）執行指示 |
| `coverletter.mjs` | 批次模式入口腳本 |
| `batch/coverletter-prompt.zh.md` | 批次模式 worker prompt 模板 |
| `examples/coverletter/past-letters.md` | 精選範本（Part A 業界模式 + Part B 你的成功信）|
| `output/coverletters/{jobNo}-{date}.md` | 新產出寫入位置（只寫不讀）|
| `fetch-jd.mjs` | JD 抓取工具 |
| `cv.zh.md` | 繁中履歷（唯一可信來源）|
| `jds/{jobNo}.md` | JD 結構化檔 |
