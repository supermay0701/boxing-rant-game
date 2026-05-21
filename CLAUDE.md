# 嘴砲擂台 — CLAUDE.md

## 專案概述

30 秒網頁拳擊遊戲。使用者上傳兩張頭像、選球衣、輸入嘴砲台詞，觀賞擂台戲、下載重播影片。
球迷發洩情緒的娛樂出口（打「雷包」球員）。刻意做 Q 版濾鏡 + 免責聲明。

## 開發

```bash
npm run dev       # 本地開發 (Vite + HMR)，通常跑在 localhost:5173
npm run build     # TypeScript 型別檢查 + 打包 → dist/
npm run test      # Vitest 單元測試（56 tests, 15 files）
npm run test:e2e  # Playwright E2E（需要瀏覽器已跑）
git push          # 自動觸發 GitHub Actions → deploy GitHub Pages
```

## 部署

- **GitHub Pages**：https://supermay0701.github.io/boxing-rant-game/
- **Repo**：https://github.com/supermay0701/boxing-rant-game（公開）
- 每次 push main 約 30 秒部署完成

## 關鍵檔案

| 檔案 | 職責 |
|------|------|
| `src/main.ts` | 入口：setup → game → replay 切換、`startGame` / `showReplay` / `computeHotZone` |
| `src/game/GameScene.ts` | 核心遊戲：AI、碰撞、combo、TTS、KO、rage mode |
| `src/game/Puncher.ts` | 扁人 AI 狀態機（idle→wind_up→strike→recover）+ chase + rage 10× |
| `src/game/Victim.ts` | 被扁 AI（Perlin noise 閃躲 + 被動吸引 + KO）|
| `src/game/DamageStateOverlay.ts` | 受傷痕跡疊圖（累積 5/8/12/16/20/25/30 傷害） |
| `src/setup/SetupPanel.ts` | 設定畫面 orchestrator + localStorage 存取 |
| `src/setup/AvatarUploader.ts` | 頭像上傳 + 最近 6 張 gallery |
| `src/shared/CartoonFilter.ts` | Q 版濾鏡管線（saturate → posterize → sobel → circle mask）|
| `src/shared/Audio.ts` | Howler + Web Audio API 合成 fallback |
| `src/styles.css` | 全部 CSS；Retro Arcade 設計系統（Bangers 字型 + 琥珀金主色） |
| `src/shared/Persistence.ts` | localStorage key `boxing-rant-game:setup-v1` |

## 版本號

版本號在 `package.json` 的 `version` 欄位。UI 右上角會自動顯示。

## 音效

`public/audio/*.mp3` 是佔位空檔（0 byte）。
Howler 載入失敗 → 自動切換 Web Audio API 合成 fallback（punch/hit/whoosh）。
BGM 是 AI（Gemini）產的。要替換：直接覆蓋 `public/audio/bgm.mp3`。

## 已知 v1 限制

- 錄影沒音效（兩個 AudioContext 無法完美 sync，拿掉避免混亂）
- iOS Safari 沒實機測過（compat banner 偵測後提示）
- 下載格式：Chrome/Edge → webm；Safari → 嘗試 mp4
- Q 版濾鏡只測 OffscreenCanvas 可用環境，其他 fallback 純圓形裁切
