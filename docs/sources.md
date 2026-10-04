# 資料與素材來源

查證日期：2026-10-04。每位人物的事件、參選狀態及公開綽號連結存放於 `src/data.ts`，並直接顯示於網站人物卡。未把創作綽號當成媒體報導稱呼。

| 人物 | 縣市／公職 | 參選資料 |
| --- | --- | --- |
| 蔣萬安 | 臺北市／直轄市長 | [中央社：登記參選](https://www.cna.com.tw/news/aipl/202609040292.aspx) |
| 沈伯洋 | 臺北市／直轄市長 | [中央社：登記參選](https://www.cna.com.tw/news/aipl/202609040292.aspx) |
| 苗博雅 | 臺北市／直轄市議員 | [TVBS：參選登記](https://news.tvbs.com.tw/politics/4017756) |
| 李四川 | 新北市／直轄市長 | [中央社：登記參選](https://www.cna.com.tw/news/aipl/202609040312.aspx) |
| 蘇巧慧 | 新北市／直轄市長 | [中央社：登記參選](https://www.cna.com.tw/news/aipl/202609040312.aspx) |
| 陳紫渝 | 新北市／村里長 | [東森新聞：登記連任](https://www.youtube.com/watch?v=M4RvNhsJq5I) |
| 周至剛 | 新北市／山地原住民區長 | [聯合報：參選報導](https://udn.com/news/story/124652/9766917) |
| 許淑華 | 南投縣／縣市長 | [中央社：登記連任](https://www.cna.com.tw/news/aipl/202609020170.aspx) |
| 鍾孟儒 | 苗栗縣／縣市議員 | [民視：參選報導](https://sport.ftvnews.com.tw/news/detail/2026925W0271) |
| 周佳琪 | 屏東縣／鄉鎮市長 | [聯合報：參選登記](https://udn.com/news/story/124652/9735138) |
| 林瑞德 | 新竹縣／鄉鎮市民代表 | [民眾黨：官方提名頁](https://www.tpp.org.tw/election2026/candidatedetail.php?cid=225) |
| 羅方妏 | 臺中市／山地原住民區民代表 | [臺中市選委會：正式登記資料](https://web.cec.gov.tw/tcec/article/64644)、[登記表 PDF](https://web.cec.gov.tw/api/file/a6a11116-26bc-4639-8eb1-17e478678920.pdf) |

## 圖片

人物插畫使用 `image_gen.imagegen` 生成，採圓形像素肖像、白色爆炸框及漫畫道具風格。不是現場照片，也不是人物本人發言。完整提示記於 [image-prompts.json](image-prompts.json)。公開照片僅用於辨識外貌，專案沒有收錄原新聞照片。

- 陳紫渝：[東森新聞參選報導](https://www.youtube.com/watch?v=M4RvNhsJq5I)。
- 周至剛：[烏來區公所區長照片](https://www.wulai.ntpc.gov.tw/userfiles/3291100/images/%E5%8D%80%E9%95%B7%E7%85%A7%E7%89%87(1).jpg)。
- 鍾孟儒：[民視報導照片](https://cdn.ftvnews.com.tw/manasystem/FileData/News/378686ca-97c3-46cd-bc6b-26140188de88.jpg)。
- 周佳琪：[屏東新聞照片](https://img.ikh.tw/ptnews/t_ptnews_26l7q86exujp_.jpg)。
- 林瑞德：[民眾黨提名照片](https://www.tpp.org.tw/aimg/a/26/193/26193130805197902e77cc.png)。
- 羅方妏：[聯合報參選報導照片](https://udn.com/news/story/7325/9599870)。

## 地圖

[g0v/twgeojson](https://github.com/g0v/twgeojson) 以 CC0 釋出，[2010 縣市 TopoJSON](https://raw.githubusercontent.com/g0v/twgeojson/master/json/twCounty2010.topo.json) 存放於 `public/assets/taiwan-counties.topo.json`。程式把改制前縣市合併成現行 22 縣市；澎湖、金門、連江使用獨立控制按鈕。此地圖用於選縣市，不代表選區邊界或人口比例。
