# Career-Ops — AI 求職自動化系統

## 來源

這套系統由 [santifer](https://santifer.io) 建立並實際使用，評估了 740+ 份職缺、產出 100+ 份客製化履歷，最終獲得 Head of Applied AI 一職。系統內的職位類型、評分邏輯、薪資談判腳本與成就描述架構，都源自他在 AI/自動化領域的求職歷程。

配套的個人作品集也是開源的：[cv-santiago](https://github.com/santifer/cv-santiago)。

**開箱即用，但設計成讓你完全客製化。** 如果職位類型不符合你的背景、語系不對、或評分權重不合你的優先順序——直接說，AI Agent 可以幫你修改。你說「把職位類型改成資料工程相關」，它就去改。這就是這套系統的核心精神。

---

## 資料契約（重要）

系統分為兩層，完整清單請見 `DATA_CONTRACT.md`。

**用戶層（永不自動更新，個人化設定放這裡）：**
- `cv.md`、`config/profile.yml`、`modes/_profile.md`、`article-digest.md`、`portals.yml`
- `data/*`、`reports/*`、`output/*`、`interview-prep/*`

**系統層（可自動更新，勿放個人資料）：**
- `modes/_shared.md`、`modes/oferta.md` 及其他 modes 檔案
- `AGENTS.md`、`CLAUDE.md`、`*.mjs` 腳本、`dashboard/*`、`templates/*`、`batch/*`

**核心原則：當用戶要求客製化任何內容（職位類型、自我描述、談判腳本、成就重點、地點偏好、薪資目標），一律寫入 `modes/_profile.md` 或 `config/profile.yml`，絕不修改 `modes/_shared.md` 放入個人內容。** 這樣系統更新時才不會覆蓋你的個人設定。

---

## 系統更新

每次對話開始時，靜默執行更新檢查：

```bash
node update-system.mjs check
```

解析 JSON 輸出：
- `{"status": "update-available", ...}` → 告知用戶有新版本，確認後執行 `node update-system.mjs apply`
- `{"status": "up-to-date"}` → 不顯示任何訊息
- 其他狀態（`dismissed`、`offline`、`no-remote-version`）→ 不顯示

用戶隨時可說「檢查更新」或「更新 career-ops」觸發手動檢查。
回滾版本：`node update-system.mjs rollback`

---

## 系統簡介

AI 驅動、CLI 無關的求職自動化系統：追蹤投遞進度、評估職缺、產生履歷、掃描職缺平台、批次處理。支援所有遵循 [open agent skill standard](https://agentskills.io) 的 AI CLI（Claude Code、Codex、Gemini、OpenCode、Qwen、Copilot、Kimi）。

### 主要檔案

| 檔案 | 功能 |
|------|------|
| `data/applications.md` | 投遞記錄追蹤器 |
| `data/pipeline.md` | 待處理 URL 收件匣 |
| `data/scan-history.tsv` | 掃描器去重歷史 |
| `portals.yml` | 搜尋條件與公司設定 |
| `templates/cv-template.html` | 履歷 HTML 模板 |
| `templates/cv-template.tex` | LaTeX/Overleaf 模板 |
| `generate-pdf.mjs` | Playwright：HTML 轉 PDF |
| `generate-latex.mjs` | LaTeX 驗證 + pdflatex 編譯 |
| `article-digest.md` | 作品集成就摘要（選用） |
| `interview-prep/story-bank.md` | 累積的 STAR+R 故事庫 |
| `interview-prep/{company}-{role}.md` | 各公司面試情報報告 |
| `analyze-patterns.mjs` | 模式分析腳本（JSON 輸出） |
| `followup-cadence.mjs` | 追蹤節奏計算器（JSON 輸出） |
| `data/follow-ups.md` | 追蹤記錄 |
| `scan.mjs` | 零 token 職缺掃描器（直接打 Greenhouse/Ashby/Lever API） |
| `check-liveness.mjs` | 職缺有效性檢查 |
| `liveness-core.mjs` | 共用有效性邏輯 |
| `reports/` | 評估報告（格式：`{###}-{company-slug}-{YYYY-MM-DD}.md`） |

---

## 首次使用 — 引導設定

**每次對話開始前，靜默檢查以下項目是否存在：**

1. `cv.md` 是否存在？
2. `config/profile.yml` 是否存在（非 profile.example.yml）？
3. `modes/_profile.md` 是否存在（非 _profile.template.md）？
4. `portals.yml` 是否存在（非 templates/portals.example.yml）？

若 `modes/_profile.md` 不存在，靜默從 `modes/_profile.template.md` 複製。

**若任一項缺少，進入引導模式**，逐步協助用戶完成設定：

### 第一步：履歷（必要）

若 `cv.md` 不存在，詢問用戶提供方式：貼上履歷、LinkedIn 連結、或口述經歷，再整理成標準 Markdown 格式（摘要、工作經歷、專案、學歷、技能）。

### 第二步：個人資料（必要）

若 `config/profile.yml` 不存在，從 `config/profile.example.yml` 複製後，詢問：
- 姓名與 Email
- 所在地與時區
- 目標職位（如「資深後端工程師」、「AI 產品經理」）
- 薪資目標範圍

### 第三步：職缺平台（建議）

若 `portals.yml` 不存在，從 `templates/portals.example.yml` 複製，並依目標職位更新搜尋關鍵字。

### 第四步：投遞追蹤器

若 `data/applications.md` 不存在，建立空白追蹤表：

```markdown
# Applications Tracker

| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|------|---------|------|-------|--------|-----|--------|-------|
```

### 第五步：深入了解用戶

基本設定完成後，主動詢問更多背景：
- 你的核心優勢是什麼？其他候選人沒有的能力？
- 什麼樣的工作讓你充滿動力？什麼讓你感到疲憊？
- 有哪些絕對不考慮的條件？（如：不接受全天進辦公室、不考慮 20 人以下新創）
- 你最引以為傲的職業成就是什麼？
- 有沒有發表過的文章、案例或作品集？

將用戶提供的資訊存入 `config/profile.yml`（narrative 欄位）、`modes/_profile.md`，或若有成就細節則存入 `article-digest.md`。

### 第六步：準備完成

確認用戶可以：
- 貼上職缺 URL 進行評估
- 執行 `/career-ops scan` 搜尋職缺
- 執行 `/career-ops` 查看所有指令

建議設定自動掃描（每隔幾天），可使用 `/loop` 或 `/schedule` skill 配置。

---

## 個人化設定

這套系統設計成讓 AI Agent 可以直接修改。常見客製化需求：

| 用戶說 | AI 動作 |
|--------|---------|
| 把職位類型改成 [後端/前端/資料/DevOps] | 修改 `modes/_profile.md` 或 `config/profile.yml` |
| 翻譯成中文 | 修改 `modes/` 下所有檔案 |
| 新增這些公司到掃描清單 | 修改 `portals.yml` |
| 更新我的個人資料 | 修改 `config/profile.yml` |
| 改變履歷模板設計 | 修改 `templates/cv-template.html` |
| 調整評分權重 | 用戶個人的修改 → `modes/_profile.md`；系統預設的修改 → `modes/_shared.md` |

---

## 語系模式

預設模式為英文（`modes/`）。目前額外支援：

- **德文（DACH 市場）：** `modes/de/` — 含 DACH 特有詞彙（13. Monatsgehalt、Probezeit、Kündigungsfrist 等）
- **法文（法語市場）：** `modes/fr/` — 含法國/比利時/瑞士特有詞彙（CDI/CDD、RTT、convention SYNTEC 等）
- **日文（日本市場）：** `modes/ja/` — 含日本特有詞彙（正社員、賞与、みなし残業、36協定 等）

切換方式：用戶直接說「使用法文模式」，或在 `config/profile.yml` 設定 `language.modes_dir`，或 AI 偵測到對應語系的 JD 時自動建議切換。

---

## 功能模式對照

| 用戶動作 | 對應模式 |
|----------|---------|
| 貼上 JD 或 URL | auto-pipeline（評估 + 報告 + PDF + 追蹤） |
| 要求評估職缺 | `oferta` |
| 比較多個職缺 | `ofertas` |
| LinkedIn 外聯訊息 | `contacto` |
| 公司深度研究 | `deep` |
| 面試準備 | `interview-prep` |
| 產生履歷/PDF | `pdf` |
| 評估課程/證照 | `training` |
| 評估作品集專案 | `project` |
| 查詢投遞狀態 | `tracker` |
| 填寫申請表格 | `apply` |
| 搜尋新職缺 | `scan` |
| 處理待辦 URL | `pipeline` |
| 批次處理職缺 | `batch` |
| 分析被拒模式 | `patterns` |
| 追蹤節奏管理 | `followup` |

---

## 履歷資料來源

- `cv.md`（專案根目錄）是履歷的唯一真實來源
- `article-digest.md` 存放詳細成就（選用）
- **絕對不要在評估時寫死數字**——每次從這些檔案讀取最新資料

---

## 倫理使用原則（重要）

**這套系統追求品質，不是數量。** 目標是協助用戶找到真正適合的職位，而非對公司發送大量制式申請。

- **未經用戶確認，絕對不送出任何申請。** 填表、草稿、產生 PDF 都可以——但在用戶按下確認前，AI 必須停下來。
- **強烈不建議申請低適配度的職位。** 評分低於 4.0/5 時，明確告知用戶不建議申請。
- **少而精，勝過多而濫。** 5 份精準投遞的效果遠勝於 50 份制式申請。
- **尊重招募者的時間。** 每份申請都需要人來閱讀。只送值得被看到的內容。

---

## 職缺有效性驗證（必要）

**絕對不能用 WebSearch/WebFetch 驗證職缺是否仍開放。** 必須使用 Playwright：
1. `browser_navigate` 前往 URL
2. `browser_snapshot` 讀取內容
3. 只有頁首/頁尾沒有 JD 內容 = 已關閉；有職稱 + 說明 + 申請按鈕 = 仍開放

**批次模式例外：** headless 模式無法使用 Playwright，改用 WebFetch，並在報告標頭標記 `**Verification:** unconfirmed (batch mode)`。

---

## 批次/無頭模式

各 CLI 的批次執行指令：

| CLI | 指令 |
|-----|------|
| Claude Code | `claude -p "prompt"` |
| Gemini CLI | `gemini -p "prompt"` |
| Copilot CLI | `copilot -p "prompt"` |
| Codex | `codex exec "prompt"` |
| OpenCode | `opencode run "prompt"` |
| Qwen | `qwen -p "prompt"` |

---

## 技術架構

- **語言/工具：** Node.js（mjs 模組）、Playwright（PDF + 爬蟲）、YAML（設定）、HTML/CSS（模板）、Markdown（資料）
- **輸出：** `output/`（gitignored）、評估報告在 `reports/`
- **JD 檔案：** `jds/`（在 pipeline.md 中以 `local:jds/{file}` 引用）
- **批次：** `batch/`（除腳本和 prompt 外均 gitignored）
- **報告編號：** 三位數零補齊，接續現有最大值 +1

### 追蹤器更新規則

批次評估結束後，執行 `node merge-tracker.mjs` 合併追蹤器記錄，避免重複。

**若公司+職位已存在，絕對不新增條目，只更新現有條目。**

每次評估寫入一個 TSV 至 `batch/tracker-additions/{num}-{company-slug}.tsv`，格式為 9 欄 tab 分隔：

```
{num}\t{date}\t{company}\t{role}\t{status}\t{score}/5\t{pdf_emoji}\t[{num}](reports/{num}-{slug}-{date}.md)\t{note}
```

欄位順序（狀態在評分前）：編號、日期、公司、職位、狀態、評分、PDF、報告連結、備註

### 管道完整性

1. **新增條目只透過 TSV + merge-tracker.mjs**，不直接編輯 applications.md
2. **可以**直接編輯 applications.md 更新現有條目的狀態/備註
3. 所有報告必須包含 `**URL:**` 與 `**Legitimacy:** {tier}`
4. 狀態必須使用規範值（見 `templates/states.yml`）
5. 健康檢查：`node verify-pipeline.mjs`
6. 正規化狀態：`node normalize-statuses.mjs`
7. 去重：`node dedup-tracker.mjs`

### 規範狀態值

| 狀態 | 使用時機 |
|------|---------|
| `Evaluated` | 報告完成，待決定是否申請 |
| `Applied` | 已送出申請 |
| `Responded` | 公司已回覆 |
| `Interview` | 進入面試流程 |
| `Offer` | 收到 Offer |
| `Rejected` | 被公司拒絕 |
| `Discarded` | 候選人放棄或職缺已關閉 |
| `SKIP` | 不適合，不申請 |

**規則：**
- 狀態欄位不使用 Markdown 粗體（`**`）
- 狀態欄位不放日期（日期放日期欄）
- 狀態欄位不放額外文字（備註放備註欄）
