# career-ops -- 台灣中文市場模式 (`modes/zh/`)

這個資料夾是給台灣中文求職市場使用的 career-ops modes。它不是只針對 104，而是覆蓋以繁體中文為主的台灣求職來源：

- 104
- CakeResume
- Yourator
- Meet.jobs
- LinkedIn Taiwan
- 公司官網
- 外商 ATS 上標示 Taiwan / Taipei / Remote Taiwan 的職缺
- 中文或中英混合 JD

## 何時使用

使用 `modes/zh/` 當：

- 主要投遞台灣職缺
- JD 是繁中或中英混合
- 需要判讀台灣薪資、福利、通勤、加班與職缺風險
- 要產生 104 / CakeResume / Yourator 常見的自我推薦、問答、履歷摘要

如果 JD 是純英文外商職缺，仍可使用通用英文 modes，或在中文評估中要求英文履歷輸出。

## 啟用方式

在 `config/profile.yml` 設定：

```yaml
language:
  primary: "zh-TW"
  modes_dir: "modes/zh"
```

本 repo 已設定為 `modes/zh`。

## 檔名說明

為了相容既有 router，檔名保留：

| 檔案 | 用途 |
|------|------|
| `_shared.md` | 台灣市場共用規則 |
| `oferta.md` | 職缺評估 |
| `apply.md` | 應徵表單與自我推薦 |
| `pipeline.md` | 待評估職缺 inbox |
| `scan.md` | 台灣平台掃描 |
| `pdf.md` | 中文/中英履歷產生規則 |
| `tracker.md` | 追蹤表檢視與狀態更新 |

`oferta` 只是歷史檔名，不代表西語內容。

## 語言原則

- 內部評估：繁體中文
- 技術詞彙：自然保留英文，例如 React、Vue、Frontend、Full-stack、API、Dashboard
- 履歷輸出：依 JD 決定，英文 JD 用英文，中文 JD 可用繁中或中英混合
- tracker 狀態：永遠使用英文 canonical states，例如 `Evaluated`, `Applied`, `Interview`
