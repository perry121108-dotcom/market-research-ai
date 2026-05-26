# TASK — market-research-ai (Phase 5 Ecosystem Bootstrapping)

> 沙盒：`D:/market-research-ai/`
> 狀態圖例：`[ ]` 待辦 ｜ `[/]` 進行中 ｜ `[x]` 完成（測試＋WORKLOG 雙綠才可勾選）

## Phase 1 — Agent-Core Governance Bootstrap

> 階段目標：透過 `agent-core` 二進位工具將強型別狀態機治理層注入本專案，並通過硬性門禁校驗。

- [/] **T1** 驗證調研提示詞與硬性不變式契約（R1 lifecycle / R2 prompt_externalization / R3 execution_evidence）
- [/] **T2** 在 `WORKLOG.md` 補上 Builder 角色任務區塊與 `<Execution_Evidence>`（含 `npm run lint` 真實 Log）
- [/] **T3** 執行 `agent-core check` 並通過 exit=0 硬性門禁
- [ ] **T4** 等待 Tester Session 進行跨 Session 隔離驗收
