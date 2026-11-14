# Protecting Sessions Against Recording: Technical Architecture & Limitations
**Document Reference:** Sprint 3 Documentation — Section 7  
**Platform:** Mr. Adel Mostafa Educational Platform  
**Authors:** Abdullah Ahmed & Mohammed Hamdy  
**Presented To:** Mr. Adel Mostafa (Product Owner) & ENG. Mohamed Abdelmonem (Supervisor)  
**Date:** November 2026  

---

## 1. Executive Summary
No web platform can physically prevent a person from pointing an external smartphone or external video camera at a physical computer monitor. Therefore, our security strategy implements a **Defense-in-Depth multi-layered architecture** designed to make unauthorized distribution technically difficult, prevent software screen capture, terminate account sharing, and ensure that any physical leak remains forensic and directly traceable to the student.

---

## 2. Multi-Layer Protection Matrix

| Security Layer | Implementation Mechanism | Threat Mitigated | Technical Limitations |
|---|---|---|---|
| **1. Signed, Short-Lived Links** | Cryptographic token (HMAC-SHA256) with 10-minute expiry tied to Student ID (`sid`) | Prevents sharing stream URLs, direct link downloading, and replay on other devices. | Does not stop local device screen recording on an authorized active session. |
| **2. DRM Integration (Widevine & FairPlay)** | Encrypted Media Extensions (EME) + ClearKey / Widevine modular pipeline | Hardware/OS-level screen recording tools capture a pure black video surface. | Supported across modern Windows/macOS/Android/iOS; older unsupported browsers fall back to player protections. |
| **3. Hardened Video Player** | Context menu blocking (`contextmenu`), `disablePictureInPicture`, `controlsList="nodownload"`, visibility change listener | Prevents standard browser "Save Video As", picture-in-picture recording, and hides stream when switching tabs. | An advanced developer might inspect memory or bypass browser-level JavaScript controls. |
| **4. Dynamic Moving Watermark** | Animated floating canvas rendering Student ID + masked phone number (`User: Nour Saeed (u1) • 010****5678`) shifting every 4s | Deters phone filming & screenshots by permanently imprinting the student's identity on any leaked footage. | Watermarking is a psychological and forensic deterrent; it does not block physical filming directly. |
| **5. Single Active Session & Suspicious Flagging** | Real-time session heartbeat + `Viewing_Sessions` state check. Concurrent login terminates previous stream immediately | Prevents credential sharing, multi-user split accounts, and commercial reselling of student logins. | Suspicious flags (e.g. rapid IP transitions) may require manual admin clearance. |

---

## 3. Clear Boundaries Documented for the Product Owner
1. **Screen Recording Tools (OBS / QuickTime / Windows Game Bar):**  
   Blocked on DRM-supported environments; on standard devices, visibility listeners blur and halt video immediately if the recording tool causes browser window focus loss.
2. **Download Extensions / Video Downloaders:**  
   Blocked by stream segment fragmentation (HLS/WebRTC), signed token verification, and disabled video controls.
3. **Physical Filming (Phone Camera):**  
   Documented as an unblockable physical limit; mitigated forensically by the dynamic, moving, semi-transparent watermark displaying the student's unique identity.
