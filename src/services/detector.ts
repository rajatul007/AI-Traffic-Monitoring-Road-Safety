import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { createWorker } from 'tesseract.js';
import { DetectionBox, TrafficLevel } from '../types';

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let ocrWorkerPromise: Promise<any> | null = null;

// Target traffic classes
const RELEVANT_CLASSES: Record<string, string> = {
  car: 'Car',
  motorcycle: 'Motorcycle',
  bus: 'Bus',
  truck: 'Truck',
  bicycle: 'Bicycle',
  person: 'Person'
};

export async function getDetectorModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = cocoSsd.load({ base: 'mobilenet_v2' });
  }
  return modelPromise;
}

export async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      try {
        const worker = await createWorker('eng');
        return worker;
      } catch (e) {
        console.warn('OCR worker initialization error:', e);
        return null;
      }
    })();
  }
  return ocrWorkerPromise;
}

export interface TrackedItem {
  trackId: number;
  class: string;
  cx: number;
  cy: number;
  history: Array<{ cx: number; cy: number; time: number }>;
  counted: boolean;
  firstSeen: number;
  lastSeen: number;
}

export class ClientTracker {
  private nextId = 1;
  private tracked: Map<number, TrackedItem> = new Map();
  private maxDistance = 75; // pixels
  private maxAgeMs = 1500;

  update(detections: cocoSsd.DetectedObject[], minConfidence = 0.45): DetectionBox[] {
    const now = Date.now();
    const result: DetectionBox[] = [];

    // Filter relevant classes & confidence
    const filtered = detections.filter(d => {
      const mappedClass = RELEVANT_CLASSES[d.class.toLowerCase()];
      return mappedClass && d.score >= minConfidence;
    });

    const currentCenters = filtered.map(d => {
      const [x, y, w, h] = d.bbox;
      return {
        cx: x + w / 2,
        cy: y + h / 2,
        class: RELEVANT_CLASSES[d.class.toLowerCase()],
        raw: d
      };
    });

    const matchedTrackerIds = new Set<number>();

    for (const curr of currentCenters) {
      let bestDist = Infinity;
      let bestId: number | null = null;

      for (const [id, item] of this.tracked.entries()) {
        if (matchedTrackerIds.has(id)) continue;
        if (item.class !== curr.class) continue;

        const dist = Math.hypot(item.cx - curr.cx, item.cy - curr.cy);
        if (dist < bestDist && dist < this.maxDistance) {
          bestDist = dist;
          bestId = id;
        }
      }

      if (bestId !== null) {
        const item = this.tracked.get(bestId)!;
        item.cx = curr.cx;
        item.cy = curr.cy;
        item.lastSeen = now;
        item.history.push({ cx: curr.cx, cy: curr.cy, time: now });
        if (item.history.length > 25) item.history.shift();

        matchedTrackerIds.add(bestId);
        result.push({
          bbox: [curr.raw.bbox[0], curr.raw.bbox[1], curr.raw.bbox[2], curr.raw.bbox[3]],
          class: curr.class,
          confidence: Math.round(curr.raw.score * 100) / 100,
          trackId: bestId,
          counted: item.counted
        });
      } else {
        const newId = this.nextId++;
        this.tracked.set(newId, {
          trackId: newId,
          class: curr.class,
          cx: curr.cx,
          cy: curr.cy,
          history: [{ cx: curr.cx, cy: curr.cy, time: now }],
          counted: false,
          firstSeen: now,
          lastSeen: now
        });
        matchedTrackerIds.add(newId);
        result.push({
          bbox: [curr.raw.bbox[0], curr.raw.bbox[1], curr.raw.bbox[2], curr.raw.bbox[3]],
          class: curr.class,
          confidence: Math.round(curr.raw.score * 100) / 100,
          trackId: newId,
          counted: false
        });
      }
    }

    // Purge old tracked objects
    for (const [id, item] of this.tracked.entries()) {
      if (now - item.lastSeen > this.maxAgeMs) {
        this.tracked.delete(id);
      }
    }

    return result;
  }

  // Check virtual counting line
  checkLineCrossing(
    lineY: number,
    onCross: (vehicleType: string, trackId: number) => void
  ) {
    for (const [id, item] of this.tracked.entries()) {
      if (item.counted || item.history.length < 2) continue;
      const prev = item.history[item.history.length - 2];
      const curr = item.history[item.history.length - 1];

      // Downward or upward crossing
      if ((prev.cy < lineY && curr.cy >= lineY) || (prev.cy > lineY && curr.cy <= lineY)) {
        item.counted = true;
        onCross(item.class, id);
      }
    }
  }

  // Check wrong-way trajectory
  checkWrongWay(
    allowedDirection: 'top-to-bottom' | 'bottom-to-top' = 'top-to-bottom',
    minDisplacement = 25
  ): number[] {
    const violators: number[] = [];
    for (const [id, item] of this.tracked.entries()) {
      if (item.history.length < 4) continue;
      const start = item.history[0];
      const end = item.history[item.history.length - 1];
      const deltaY = end.cy - start.cy;

      if (allowedDirection === 'top-to-bottom' && deltaY < -minDisplacement) {
        violators.push(id);
      } else if (allowedDirection === 'bottom-to-top' && deltaY > minDisplacement) {
        violators.push(id);
      }
    }
    return violators;
  }

  reset() {
    this.tracked.clear();
    this.nextId = 1;
  }
}

// Traffic Density calculation helper
export function computeDensityLevel(
  activeCount: number,
  lowThresh = 10,
  modThresh = 25
): TrafficLevel {
  if (activeCount <= lowThresh) return 'LOW';
  if (activeCount <= modThresh) return 'MODERATE';
  return 'HIGH';
}

// OCR Number plate recognition helper
export async function recognizePlateFromCanvas(
  sourceCanvasOrVideo: HTMLCanvasElement | HTMLVideoElement,
  bbox: [number, number, number, number]
): Promise<{ text: string; recognized: boolean; confidence: number }> {
  try {
    const worker = await getOcrWorker();
    if (!worker) {
      return { text: 'Number Plate Not Clearly Recognized', recognized: false, confidence: 0 };
    }

    const [x, y, w, h] = bbox;
    // Lower 40% of vehicle bounding box
    const plateY = Math.max(0, y + h * 0.6);
    const plateH = Math.max(15, h * 0.4);
    const plateX = Math.max(0, x + w * 0.15);
    const plateW = Math.max(30, w * 0.7);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = plateW;
    tempCanvas.height = plateH;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) {
      return { text: 'Number Plate Not Clearly Recognized', recognized: false, confidence: 0 };
    }

    ctx.drawImage(sourceCanvasOrVideo, plateX, plateY, plateW, plateH, 0, 0, plateW, plateH);

    // Apply high contrast & grayscale filter for plate readability
    const imgData = ctx.getImageData(0, 0, plateW, plateH);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      // Threshold
      const val = avg > 128 ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);

    const { data: ocrData } = await worker.recognize(tempCanvas);
    const cleaned = ocrData.text.replace(/[^A-Z0-9]/g, '').trim();

    // Standard number plate format validation (5 to 11 alphanumeric characters)
    if (cleaned.length >= 6 && ocrData.confidence > 45) {
      return {
        text: cleaned,
        recognized: true,
        confidence: Math.round(ocrData.confidence) / 100
      };
    }
  } catch (err) {
    console.warn('Plate OCR processing error:', err);
  }

  return {
    text: 'Number Plate Not Clearly Recognized',
    recognized: false,
    confidence: 0
  };
}
