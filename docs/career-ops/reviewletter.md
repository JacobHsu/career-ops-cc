# /career-ops reviewletter — 推薦信 HR 審稿

扮演**台灣資深 HR / 招募主管**角色，審核 `/career-ops coverletter` 產出的推薦信，給量表評分與具體修改建議。

**只審稿、不改稿。** 修改決策由使用者執行。

---

## 使用方式

```
/career-ops reviewletter 8xxxxx
```

從 `output/coverletters/{jobNo}-*.md` 找**檔名日期最新的**那篇來審。同日多篇取字典序最後一個。

### 與 `/career-ops coverletter` 的關係

```
/career-ops coverletter 8xxxxx        # 寫
   ↓ 產出 output/coverletters/8xxxxx-2026-06-01.md
/career-ops reviewletter 8xxxxx       # 審
   ↓ 顯示評分 + 修改建議
（你決定要不要改）
   ↓
/career-ops reviewletter 8xxxxx       # 改完二次審稿
```

**為什麼分開？**

| 整合進 coverletter | 分開 `/career-ops reviewletter` |
|---|---|
| 寫信（創造）+ 審稿（批判）是不同心智模式 | 寫手歸寫手、HR 歸 HR |
| 每次都付 review token | 滿意了再審，省 token |
| 只能審剛產的那篇 | 可審任何一篇含手動編輯過的 |
| 信 + 評混在一起讀 | 分次來，閱讀負擔小 |

---

## 前置條件檢查

執行前先列 checklist：

```
== 審稿前置檢查（jobNo: 8xxxxx）==

必要檔案：
  [✅] output/coverletters/8xxxxx-*.md（最新一篇）
  [✅] jds/8xxxxx.md
  [✅] cv.zh.md

選用檔案（影響審稿嚴謹度）：
  [✅] examples/coverletter/past-letters.md
  [—]  reports/{對應該公司的評估報告}
```

任何必要 ❌ → 立即停止 + 修補指令。

---

## 審稿框架（六項評分，1–5 分）

| 項目 | 檢查重點 |
|------|---------|
| **真實性** | 信件每個經歷、技術、數字必須在 `cv.zh.md` 找得到 |
| **套話偵測** | 禁用詞清單（熱愛學習、抗壓性高、敬請惠予機會…）|
| **CAR 框架** | 第二段是否具備 Challenge / Action / Result |
| **JD 匹配度** | 是否回應 JD 的主要職責、必要技能、公司方向 |
| **結構字數** | 4 段、250–350 字、段落均衡 |
| **語氣可讀性** | 不誇大、保留英文技術詞、不每句「我」開頭 |

**真實性 < 3 分時**：整體不通過，必須先修真實性才繼續看其他項目。

---

## 輸出格式

```
## 推薦信審稿報告 — jobNo {job_id}

**審稿檔案**：output/coverletters/{job_id}-{date}.md
**對應職缺**：{Company} {Role}
**審稿日期**：{YYYY-MM-DD}

---

### 評分總表

| 項目 | 分數 | 一句話 |
|------|------|--------|
| 真實性 | X/5 | ... |
| 套話偵測 | X/5 | ... |
| CAR 框架 | X/5 | ... |
| JD 匹配度 | X/5 | ... |
| 結構字數 | X/5 | ... |
| 語氣可讀性 | X/5 | ... |
| **總分** | **XX/30** | **{建議：可送 / 微調後送 / 大改 / 重寫}** |

---

### 詳細問題（按嚴重度排序）

#### 🔴 嚴重（必須修）
1. **{問題分類}**：{問題描述}
   - 原文：「{引用句子}」
   - 建議：「{改寫後句子}」
   - 理由：{為什麼要改}

#### 🟡 中等（建議修）
（同上格式）

#### 🟢 微調（可保留）
（同上格式）

---

### 整體評語（HR 視角）

{2–3 句總評，模擬真實 HR 拿到這封信的第一印象}

### 下一步建議

- [ ] 修改 X 點嚴重問題後可投遞
- [ ] 通過，可直接投遞
- [ ] 修完後執行 /career-ops reviewletter {job_id} 二次審稿
```

---

## 資料來源

| 路徑 | 必要性 | 用途 |
|------|--------|------|
| `output/coverletters/{jobNo}-*.md` | 必讀 | 待審推薦信 |
| `jds/{jobNo}.md` | 必讀 | 比對 JD 匹配度 |
| `cv.zh.md` | 必讀 | 驗證真實性 |
| `examples/coverletter/past-letters.md` | 若存在則讀 | 文風基準線 |
| `reports/{num}-*.md` | 若存在則讀 | fit 分析輔助 |

---

## 設計原則

- **嚴格但建設性**：HR 角色定位，不羞辱、不打官腔
- **不直接改信**：只給 before / after 建議，由使用者決定
- **after 句也必須真實**：建議的改寫句必須能從 `cv.zh.md` 驗證，不為了好聽自己編
- **不硬找問題**：信件沒問題就誠實寫「通過」
- **真實性最優先**：CV 沒寫的就視為編造，不能因「合理推測」放行

---

## 常見問題

**Q: 可以審手動編輯過的信嗎？**
A: 可以。只要存在 `output/coverletters/{jobNo}-*.md` 就能審。

**Q: 同 jobNo 有多份檔案會審哪份？**
A: 檔名日期最新那份；同日多份取字典序最後一個。要審舊版本就重新命名。

**Q: HR reviewer 會幫我改信嗎？**
A: 不會。只會給 before / after 建議，改動由你執行。

**Q: 真實性怎麼判斷？**
A: 嚴格對照 `cv.zh.md`。信件提到「3 年某技術」但 CV 沒寫年資 → 標 ⚠️。提到一個 cv 完全沒有的公司 → 標 ❌ 編造。

**Q: 通過幾分可以投遞？**
A: 沒硬性門檻，但建議：
- 真實性必須 ≥ 4
- 總分 ≥ 24/30 可直接送
- 18–23 微調後送
- < 18 大改

---

## 相關檔案

| 路徑 | 角色 |
|------|------|
| `modes/zh/reviewletter.md` | 審稿模式執行指示 |
| `output/coverletters/{jobNo}-{date}.md` | 待審推薦信 |
| `jds/{jobNo}.md` | 對應 JD |
| `cv.zh.md` | 真實性比對基準 |
| `examples/coverletter/past-letters.md` | 文風基準線 |
