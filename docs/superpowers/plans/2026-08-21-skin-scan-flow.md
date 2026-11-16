# Skin Scan Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม flow สแกนผิว 3 ขั้นที่ทดสอบได้และเชื่อมหน้าผลเดิม

**Architecture:** reducer คุมสถานะและ UI แยกตามขั้น พร้อม service contracts สำหรับกล้องและ AI รอบนี้ใช้ timer mock

**Tech Stack:** Expo SDK 57, React Native, Expo Router, TypeScript, Jest

**Spec:** `docs/superpowers/specs/2026-08-21-skin-scan-flow-design.md`

## Global Constraints

- ใช้ Expo SDK 57
- ไม่มีอิโมจิ ใช้ไอคอนทั้งหมด
- bottom tab bar ต้องคงอยู่
- mock flow ต้องเปลี่ยนเป็นบริการจริงได้โดยไม่เปลี่ยน reducer/UI contract

### Task 1: Scan state machine

- [ ] เขียน test transitions prepare → scanning → analyzing → completed และ reset
- [ ] สร้าง types และ reducer
- [ ] รัน test ให้ผ่าน

### Task 2: Service contracts

- [ ] สร้าง `CameraCaptureService` และ `SkinAnalysisGateway`
- [ ] กำหนด payload รูปและ progress callback

### Task 3: Three-step UI

- [ ] สร้าง prepare UI พร้อม instruction card และปุ่ม
- [ ] สร้าง scanning UI พร้อม face guide และ mock auto capture
- [ ] สร้าง analyzing UI พร้อม animation/progress
- [ ] เชื่อม completed ไป component ผลเดิม

### Task 4: Route and verification

- [ ] เปลี่ยน analysis tab ให้เข้า scan flow
- [ ] รัน typecheck, lint และ tests ทั้งหมด
