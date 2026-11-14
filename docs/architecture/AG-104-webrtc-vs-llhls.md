# Architectural Decision Record: AG-104 Live Streaming Architecture
**Decision:** Hybrid WebRTC for Broadcaster Ingest + Low-Latency HLS (LL-HLS) for Viewer Distribution  
**Jira Story:** PBI-18 / AG-46 (Native live streaming inside the platform)  
**Author:** Abdullah Ahmed & Mohammed Hamdy  
**Date:** November 2026  
**Status:** Approved & Implemented  

---

## 1. Context & Requirements
The Product Owner (Mr. Adel Mostafa) requested native live streaming inside the educational platform with the following non-negotiable acceptance criteria:
1. **Teacher Broadcaster:** Must broadcast directly from the modern web browser without mandatory third-party software (OBS/vMix) for routine classes.
2. **Latency:** Delay must stay strictly under 10 seconds over 4G mobile networks across Egypt.
3. **Resilience:** The stream must automatically reconnect after temporary mobile network drops.
4. **Recording:** The completed live session must be automatically archived and published as a recorded lecture within 30 minutes.
5. **Backup:** An external stream fallback option (YouTube Live / Zoom / Mux) must remain available at all times.

---

## 2. Technology Comparison: WebRTC vs. LL-HLS

| Metric / Capability | Pure WebRTC | Standard HLS | Low-Latency HLS (LL-HLS) | **Chosen Hybrid Approach** |
|---|---|---|---|---|
| **Broadcaster Ingest** | Ultra-simple (`getUserMedia` / `getDisplayMedia`) | Requires RTMP server or OBS | Requires specialized packaging | **WebRTC Ingest** |
| **Glass-to-Glass Latency** | 200ms – 1.5s | 15s – 30s | 1.5s – 4.5s | **1.2s – 2.8s (well under 10s on 4G)** |
| **Viewer Scalability** | Expensive per-stream egress; difficult for > 200 students | Inexpensive CDN caching | Inexpensive HTTP chunked CDN caching | **CDN Edge Caching (LL-HLS)** |
| **4G Packet Loss Tolerance** | Drops quality or freezes under unstable bandwidth | High buffering | Graceful adaptive bitrate degradation | **Adaptive Bitrate Streaming** |
| **Auto-Recording Pipeline** | Requires server-side SFU/MCU composite mixing | Native `.ts` / `.mp4` chunks stored in GCS/S3 | Segments natively concatenated to MP4 in < 15 min | **Immediate Chunk Packaging** |

---

## 3. Architecture Specification

```
[ Teacher Studio Browser ]
         │ (WebRTC Ingest / MediaStream)
         ▼
[ Ingest Server / Edge SFU ]
         │ (Transmuxing & HLS Chunking: 1.5s chunk duration)
         ▼
[ Global CDN / Edge Distribution ]
         │
         ├─────────────────────────────────────────┐
         ▼                                         ▼
[ 250+ Students Viewing (LL-HLS) ]        [ Auto-Archive Cloud Storage ]
(Sub-2s latency, auto-reconnect)           (Recorded lecture within 30 min)
```

### 3.1 Broadcast Workflow
1. The teacher navigates to `/live/:id/studio` and clicks **"Start Native Broadcast"**.
2. The browser accesses camera/microphone via `navigator.mediaDevices.getUserMedia` or desktop screen via `getDisplayMedia`.
3. Low-latency streaming starts. Broadcast stats monitor bitrate (2.8 Mbps average), FPS (30–60), and network health.

### 3.2 Resilience & Reconnection
- If the student's 4G connection fluctuates, the player switches to a smaller chunk buffer or lower bitrate ladder (360p / 720p).
- In the event of an abrupt disconnect, the player activates an exponential backoff auto-reconnect sequence.
- If native streaming is disrupted by cellular carrier blocking, the student can toggle the **"Switch to Backup External Stream"** button to load the mirrored YouTube/Mux stream.

### 3.3 Auto-Archive within 30 Minutes
- When the teacher clicks **"End & Publish as Lecture"**, the stream pipeline closes the session, aggregates the audio/video segments, and injects a recorded lecture record (`rec_lec_*`) directly into the platform's lecture catalog.
- The session is immediately available under **Recorded Lectures** for student revision and diagnostic quiz attachment.
