# 嘴砲擂台小遊戲 — 設計文件

**日期**：2026-05-21
**狀態**：Draft，待使用者審查
**作者**：Claude + 使用者

---

## 1. 目的與情境

製作一個一分鐘小遊戲，提供體育球迷對「雷包」球員發洩情緒的娛樂出口。玩家上傳兩張頭像（扁人者 / 被扁者），選擇球衣風格，輸入嘴砲台詞，然後觀賞單方面的擂台戲。所有人像會先在瀏覽器內以 Canvas 濾鏡卡通化以降低肖像權爭議，並在角色旁附上「純屬虛構搞笑」免責提醒。

**核心樂趣**：客製化（上傳/嗆聲）→ 觀賞（爽感打擊+嘴砲）→ 分享（重播下載）。

---

## 2. Scope

### In-scope（v1）

- Setup 畫面：Tab 切換扁人/被扁，含「命名 + 免責提醒」、「頭像（上傳 + Q版濾鏡）」、「服裝（6 組預設 + 自製上傳）」，**嗆聲僅扁人 tab 有**（5 句 × 每句 15 字）
- Game 畫面：512×512 正方形擂台，60 秒倒數，雙方圓形 Q 版角色（圓頭/圓身/長手帶拳套/短圓腿），扁人 AI 揮拳，被扁 AI 表面閃躲、實際被慢慢拉近
- 嘴砲呈現：漫畫對話框從扁人者頭上冒出，1 秒淡出，同步以瀏覽器內建 Web Speech API 念出
- 連擊系統：5/10/20 連擊觸發畫面震動 + 飄字 badge
- 被扁狼狽演出：依累積擊中數疊圖（眼冒金星 → 腫包 → 鼻血 → 蓬亂）
- 錄影功能：MediaRecorder 全程錄 .webm，結束後可重播 + 下載
- Replay 畫面：影片播放 + 統計面板 + 「再戰一場」/「重打上一位」按鈕
- 自動記住上次設定（localStorage）
- 音效：拳擊、叫聲、背景音樂（CC0 素材）

### Out-of-scope（v1 不做）

- 真實 AI 影像 Q版化（用 Canvas 濾鏡近似，避免 API 成本）
- 雲端 TTS（用瀏覽器內建）
- 慢動作 KO、截圖按鈕、觀眾席背景、被扁逃跑高級動畫
- 內建經典嗆聲樣本庫
- 多人連線
- 行動裝置觸控優化（v1 以桌機瀏覽器為主，但 RWD 不破版）

---

## 3. 技術棧

| 層 | 選擇 | 理由 |
|----|------|------|
| 語言 | TypeScript | 編譯期型別安全，遊戲狀態多 |
| 建置 | Vite | 快、Hot reload、輸出純靜態 |
| 渲染 | HTML5 Canvas 2D API | 簡單夠用，無 WebGL 依賴 |
| UI 框架 | 無（原生 HTML/CSS） | Setup 表單不複雜，不需要 React |
| 音效 | Howler.js | 跨瀏覽器音訊處理穩定 |
| 影像錄製 | MediaRecorder API + canvas.captureStream | 原生、無依賴 |
| 語音合成 | Web Speech API（SpeechSynthesis） | 免費、離線可用 |
| 儲存 | localStorage | 設定資料 < 5KB 夠用 |
| 測試 | Vitest（單元）+ Playwright（E2E） | TS 生態常用 |
| 部署 | GitHub Pages / Netlify | 純靜態 |

---

## 4. 目錄結構

```
Game3/
  index.html
  vite.config.ts
  package.json
  tsconfig.json
  src/
    main.ts                 # 入口、畫面切換
    setup/
      SetupPanel.ts         # Tab orchestrator
      NameField.ts          # 命名 + 免責徽章
      AvatarUploader.ts     # 上傳 + Q版濾鏡 + 圓裁
      JerseyPicker.ts       # 預設色 + 上傳球衣
      TrashTalkEditor.ts    # 5 句嗆聲編輯
      types.ts              # SetupData / CharacterSetup
    game/
      GameLoop.ts           # rAF 主迴圈
      Ring.ts               # 正方形擂台繪製
      Character.ts          # 共通：圓頭/圓身/長手/拳套/短腿
      Puncher.ts            # 扁人 AI（state machine）
      Victim.ts             # 被扁 AI（noise + attraction）
      HitDetect.ts          # 圓-圓相交判定
      ComboTracker.ts       # 連擊計數 + milestone
      DamageStateOverlay.ts # 狼狽演出疊圖
      SpeechBubble.ts       # 對話框 + TTS 觸發
      Recorder.ts           # MediaRecorder 包裝
      Timer.ts              # 60 秒倒數
      HUD.ts                # 倒數 + 連擊顯示
    replay/
      ReplayPlayer.ts       # video 播放 + 下載
      StatsPanel.ts         # 統計面板
      ActionBar.ts          # 再戰/重打按鈕
    shared/
      GameStore.ts          # 共用狀態 + EventEmitter + localStorage 同步
      CartoonFilter.ts      # Q 版濾鏡管線（含 Worker）
      Audio.ts              # Howler 包裝
      TTS.ts                # Web Speech 包裝
      Persistence.ts        # localStorage 讀寫
  public/
    audio/                  # 拳擊音、叫聲、BGM（CC0）
    jerseys/                # 預設球衣 SVG/PNG
  tests/
    unit/                   # Vitest
    e2e/                    # Playwright
```

---

## 5. 三畫面架構

單頁應用，無 router。`main.ts` 持有 `currentScreen: 'setup' | 'game' | 'replay'`，切換對應 div 的 display。

**流轉：**

```
[Setup] --開打--> [Game] --60s/KO--> [Replay] --再戰--> [Setup]
                                                 \-重打--> [Game]（保留 setup data）
```

**共用 GameStore：**

- 純資料 class，持有 `puncher`, `victim`, `stats`, `recording`
- 改值用 `store.set()`，內部 emit `'change'`，畫面訂閱重繪
- 每次 `set()` 自動序列化寫 localStorage（recording 除外，太大）

---

## 6. Setup 畫面元件

### 6.1 SetupPanel
- Orchestrator，持有 `activeTab: 'puncher' | 'victim'`
- 渲染 tab 切換 + 對應子元件
- 收集子元件 change 事件，組成 `SetupData`，「開打」前驗證

### 6.2 NameField
- input + 免責徽章（橘色 `⚠ 純屬虛構搞笑，與真實世界無關`）
- 驗證：1–10 字、不可空白
- 輸出：`onChange(name: string)`

### 6.3 AvatarUploader
- `<input type="file" accept="image/*">`
- 接收 File → 丟給 `CartoonFilter.apply()` → 預覽 64px 圓形縮圖
- 限制：jpg/png/webp、≤ 5MB
- 失敗 fallback：原圖直接圓形裁切，console.warn
- 輸出：`onChange(filteredImageData: ImageBitmap)`

### 6.4 JerseyPicker
- 6 組預設雙色配（紫黃、紅黑、藍白、紅白、綠紅、橘藍）+ 1 個「＋」上傳按鈕
- 上傳：自製球衣圖 → 縮成 128×128 ImageBitmap
- 輸出：`{ type: 'preset', primary, secondary } | { type: 'custom', bitmap }`

### 6.5 TrashTalkEditor（僅扁人 tab 顯示）
- 5 個 input 列，每列字數計數（10/15 樣式）
- 「＋ 新增」按鈕，到 5 句後 disable
- 每句驗證：1–15 字、不可空白（空白句不送）
- 輸出：`onChange(talks: string[])`

### 6.6 SetupData 介面

```ts
export interface CharacterSetup {
  name: string;
  avatar: ImageBitmap;
  jersey: JerseyConfig;
}

export type JerseyConfig =
  | { type: 'preset'; primary: string; secondary: string }
  | { type: 'custom'; bitmap: ImageBitmap };

export interface SetupData {
  puncher: CharacterSetup & { talks: string[] };
  victim:  CharacterSetup;
  duration: number; // ms, 預設 60000
}
```

### 6.7 「開打」按鈕驗證

兩 tab 的 name/avatar/jersey 都填、扁人 talks ≥ 1 句 → enabled，否則灰掉並顯示「請先完成 XXX」。

---

## 7. CartoonFilter 濾鏡管線

跑在 Web Worker，輸入 File，輸出 ImageBitmap（已圓形裁切）。

```
File → decode → resize 256×256 → saturate(1.6) → posterize(6 階)
     → sobel edge overlay → circle mask → ImageBitmap
```

- Resize / saturate 用 OffscreenCanvas + `ctx.filter`
- Posterize：pixel 迴圈，`floor(c / 43) * 43`
- Sobel：3×3 卷積算梯度，超 threshold 畫黑線疊上
- 圓形裁切：用 `globalCompositeOperation = 'destination-in'` + arc
- 失敗（OffscreenCanvas 不可用）→ fallback 跑 main thread 簡化版（只裁圓 + saturate）

---

## 8. Game 畫面元件

### 8.1 GameLoop（60 FPS）

```
requestAnimationFrame
  → delta = now - last
  → timer.tick(delta)
  → puncher.update(delta, victim.position)
  → victim.update(delta, puncher.position)
  → hits = hitDetect.check(puncher, victim)
  → combo.update(hits, delta)
  → damage.update(hits)
  → speech.maybeTrigger(hits)
  → render(ctx)
  → 循環
```

### 8.2 Puncher AI

狀態機：`idle → wind_up (0.15s) → strike (0.12s) → recover (0.25s) → idle`，cooldown 0.5s。

觸發條件：`victim` 距離 ≤ punchRange (110px) 且 cooldown 結束 → 進 `wind_up`。

`strike` phase 內，拳套圓心由「身體位置 + 手臂角度 × 手臂長度」算出。

### 8.3 Victim AI

每 frame 計算位移 = `noiseOffset + attractionVector`：

- **noiseOffset**：Perlin noise，振幅 60px、頻率 0.5Hz —— 看起來在閃
- **attractionVector**：朝 puncher 0.25 px/frame 拉力
- **bounce-back**：被擊中後 30px 反向位移，0.3s 內復原
- **fake jump**：每 8 秒 0.4s 衝刺，方向永遠錯（演技用）
- **clamping**：碰擂台繩界反彈

調參目標：60 秒平均產生 25–35 次擊中。

### 8.4 HitDetect

只在 puncher 處 `strike` phase 時檢查。算出拳套圓心 → 跟 victim 身體圓做圓-圓相交（圓心距 ≤ r1+r2）。每拳只結算一次（用 `currentStrikeId` 鎖）。

### 8.5 ComboTracker

每次命中 `combo++`，1.5s 沒命中 → `combo = 0`。`combo === 5 || 10 || 20` → emit `combo-milestone`。

### 8.6 DamageStateOverlay

依 `victim.hitsTaken` 渲染 overlay sprite：
- ≥ 5：旋轉金星
- ≥ 10：腫包紅色凸起
- ≥ 20：鼻血流線
- ≥ 30：頭髮亂、五官變慘表情

### 8.7 SpeechBubble + TTS

每次命中 30% 機率觸發。台詞 round-robin（避免短時間重複）。對話框從 puncher 頭頂冒出（高度依角色 y 計算），1 秒淡出。同步呼叫 `TTS.speak(text)`。

### 8.8 Recorder

進 Game：`stream = canvas.captureStream(30); recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })`，`recorder.start()`。

結束：`recorder.stop()` → `ondataavailable` 收 Blob → `store.set('recording', blob)`。

不支援 fallback：偵測 `MediaRecorder.isTypeSupported('video/webm')`，不支援 → 跳過錄影、Replay 顯示「瀏覽器不支援錄影」。

### 8.9 HUD

HTML overlay（不畫 canvas，避免錄影 watermark）：
- 左上：`Time: 00:42`
- 右上：`Hits: 23   Combo: x5`

### 8.10 螢幕震動

監聽 `combo-milestone` → 對遊戲容器 `.shake { animation: shake 0.3s }`，CSS keyframe translate 抖動。

---

## 9. Replay 畫面元件

### 9.1 ReplayPlayer
- `<video src={blobURL} controls autoplay>` 播 store.recording（**完整 60 秒**，非自動剪輯）
- 影片下方時間軸標出「精華時刻」標記（連擊 milestone、最狠 10s 區間起點），點擊跳轉
- 「下載 .webm」按鈕：`a.download = 'fight.webm'; a.click()`

> 「精華重播」在 v1 = 完整錄影 + 時間軸標記跳轉。自動剪輯 highlight reel 留給 v2。

### 9.2 StatsPanel
- 從 Recorder 過程記下的事件流計算：
  - 總命中數
  - 最高連擊
  - 最狠 10 秒區間（密度最高）
  - 被扁狼狽等級

### 9.3 ActionBar
- 「再戰一場」：清 recording，回 Setup
- 「重打上一位」：保留 setup data，直接進 Game（不用重設）

---

## 10. 共用 store / 持久化

```ts
class GameStore extends EventEmitter {
  state = {
    puncher: null as CharacterSetup & { talks: string[] } | null,
    victim:  null as CharacterSetup | null,
    stats:   null as GameStats | null,
    recording: null as Blob | null,
  };

  set<K extends keyof State>(key: K, value: State[K]) {
    this.state[key] = value;
    this.emit('change', key);
    if (key !== 'recording') this.syncLocalStorage();
  }

  private syncLocalStorage() {
    // 序列化 ImageBitmap → dataURL 存
  }

  loadFromLocalStorage() { /* ... */ }
}
```

**localStorage 限制**：ImageBitmap 序列化成 dataURL 字串（PNG base64），約 50–150KB / 張，4 張總計 < 1MB，安全。

---

## 11. 錯誤處理

| 場景 | 處理 |
|------|------|
| 上傳檔不是圖片 / >5MB | 紅字提示「請選 jpg/png/webp，5MB 內」，欄位保持空 |
| Q版濾鏡 Worker 不可用 | Fallback 原圖圓形裁切，console.warn |
| Web Speech API 不可用 | TTS 預設關閉，仍顯示對話框，不報錯 |
| MediaRecorder 不支援 | Replay 顯示「瀏覽器不支援錄影」，遊戲仍可玩 |
| localStorage 滿 | 寫入失敗 → console.warn，「重打上一位」按鈕灰掉 |
| 上傳球衣比例怪 | cover-fit 裁切，不變形 |
| 60 秒結束時 recorder 還在 buffering | 等 `ondataavailable` 最多 2 秒，超時用部分 buffer |

---

## 12. 測試策略

### Unit (Vitest)
- `CartoonFilter.posterize()` — 已知 input 斷言色階數
- `ComboTracker` — 時序測試（連擊、超時重置）
- `HitDetect.circlesIntersect()` — 邊界 case
- `Persistence.save/load` — round-trip
- `Puncher` 狀態機轉移
- `Victim` attraction force 計算

### Component (jsdom + Vitest)
- TrashTalkEditor：超過 15 字截斷、超過 5 句不可新增
- SetupPanel：驗證未過時「開打」disabled
- AvatarUploader：超大檔顯示錯誤訊息

### E2E (Playwright)
- Happy path：填兩邊資料 → 開打 → 等 60s → Replay 出現 → 下載按鈕可點

### 不測
- AI「感覺對不對」（人類主觀，靠 playtesting）
- 視覺渲染像素級正確

---

## 13. 部署

- `npm run build` → `dist/` 純靜態
- 部署 GitHub Pages 或 Netlify drop folder
- 無後端、無資料庫

---

## 14. 已決定事項（v1）

- **音效素材**：v1 先用佔位音（自合成或 freesound 隨手抓），不擋進度。介面上抽出 `Audio.ts` 包裝層方便日後替換。
- **預設球衣配色**：6 組全部使用抽象色塊（不暗指任何真實球隊），明確傳達「這是虛構」。具體 6 組初定：
  1. 紫黃 `#7E57C2` / `#FFD54F`
  2. 紅黑 `#E53935` / `#1A1A1A`
  3. 藍白 `#1976D2` / `#FFFFFF`
  4. 綠橙 `#43A047` / `#FB8C00`
  5. 粉藍 `#EC407A` / `#29B6F6`
  6. 黑金 `#212121` / `#FFC107`
  （實作期可依視覺微調，原則：飽和、雙色高對比、不撞真實隊徽。）
- **iOS Safari 相容性**：採「偵測 + 提示但不擋」策略。
  - 進站偵測 `MediaRecorder` 與 `SpeechSynthesis` 可用性
  - 任一不可用 → 頁面頂部黃色橫幅：「部分功能（錄影/語音）在你的瀏覽器可能失效，建議用桌機 Chrome/Edge 體驗完整版」
  - 仍允許進入遊戲；失敗的功能靜默 fallback
  - **實作期需實機測 iOS Safari 16+**，現代版可能支援度比我預期好，視結果調整橫幅文案
- **Q版濾鏡強度**：固定一檔（中強度）。`CartoonFilter.apply()` 不開參數，純函式。日後要分檔再說。
