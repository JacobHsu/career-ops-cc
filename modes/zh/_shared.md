# 台灣中文市場共用規則

這個檔案定義台灣中文求職市場的預設判讀。個人化內容仍以 `config/profile.yml` 和 `modes/_profile.md` 為準。

## 資料來源

每次評估前讀取：

- `cv.md`
- `config/profile.yml`
- `modes/_profile.md`
- `article-digest.md` 如果存在
- 相關 report 或 pipeline context

不可憑記憶編造經歷、技能或數字。

## 台灣市場評估重點

評估職缺時，除了技能匹配，也要明確判讀：

- 月薪、年薪、保障年薪、年終、分紅、股票或 RSU
- 「面議」是否合理，以及是否符合台灣揭露薪資慣例
- 勞保、健保、勞退、特休、病假、補休
- 試用期、加班費、責任制、工時彈性
- 遠端、混合辦公、每週到辦天數、通勤成本
- 公司型態：產品公司、SI、接案、派遣、駐點、博弈、Web3、外商台灣辦公室
- 職缺是否實際是維運、切版、全包雜工或低自主權角色

## 薪資判讀

台灣 JD 常見薪資寫法：

- 月薪：例如 `NT$70,000 - 100,000 / 月`
- 年薪：例如 `NT$1,200,000+`
- 保障年薪：例如 `保障 14 個月`
- 面議：需判斷是否只是平台限制或刻意不透明
- Contractor / 接案：需用月費或日費換算，不能直接和正職月薪比較

比較 offer 時，應拆開：

| 項目 | 判讀 |
|------|------|
| Base | 月薪或年薪 |
| Guaranteed | 保障幾個月 |
| Bonus | 年終、績效、分紅 |
| Equity | 股票、選擇權、RSU |
| Benefits | 勞健保、勞退、特休、補助 |
| Work mode | 遠端、混合、通勤成本 |

如果薪資資料不足，直接說不足，不要猜。

## 風險訊號

台灣職缺中常見風險：

- 「抗壓性高」、「配合專案時程」、「責任制」、「可接受加班」
- 一個職缺同時要求前端、後端、UI/UX、DevOps、PM、客服
- 技術棧過舊但要求「快速學習新技術」
- 長期開缺、頻繁重貼、JD 模糊
- 派遣、駐點、接案包裝成產品職
- 面議但沒有任何薪資區間
- 遠端寫彈性，但實際要求每天到辦

不要把風險寫成指控；只列出訊號與影響。

## 角色分類

預設分類：

- Senior Frontend Engineer
- React / Vue Product Engineer
- Full-stack Web Engineer
- Frontend Engineer for AI / Data Products
- Web3 / DeFi Frontend Engineer
- Internal Tools / Dashboard Engineer
- EdTech Product Engineer

分類後再讀 `modes/_profile.md`，用使用者的個人定位覆蓋預設。

## 輸出語言

- 中文 JD：繁體中文評估
- 中英混合 JD：繁中分析，技術詞保留英文
- 英文 JD：可用英文評估；如果使用者在台灣市場流程中，仍補台灣市場判讀
- 應徵文字：依平台與 JD 語言決定，104/CakeResume/Yourator 預設繁中或中英混合

## Tracker 狀態

狀態欄永遠使用 `templates/states.yml` 的英文 canonical states：

- `Evaluated`
- `Applied`
- `Responded`
- `Interview`
- `Offer`
- `Rejected`
- `Discarded`
- `SKIP`

不要寫 `已評估`、`已投遞`、`不投` 到 status 欄；中文說明放 Notes。
