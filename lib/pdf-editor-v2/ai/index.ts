/**
 * Commercial-Grade PDF Resume Editor — AI Integration Service (Phase 14)
 * 
 * Connects Google Gemini to our Document Model. When text is rewritten,
 * we never regenerate or replace the entire PDF. Instead, we receive the target
 * object ID and execute an atomic AIRewriteCommand via the History Engine,
 * ensuring the new text obeys original font, font size, and bounding box constraints.
 */

import { DocumentObject } from '../types';
import { usePdfEditorStore } from '../store';
import { historyEngine, AIRewriteCommand } from '../history';

export interface AIRewriteOptions {
  targetKeywords?: string[];
  tone?: 'professional' | 'executive' | 'technical' | 'concise';
  maxChars?: number;
}

export interface AIRewriteResult {
  objectId: string;
  originalText: string;
  rewrittenText: string;
  success: boolean;
  error?: string;
}

export interface AIIntegrationService {
  /**
   * Rewrite a single bullet point or text span using Gemini.
   * Modifies only the target document object via an AIRewriteCommand.
   */
  rewriteBullet(objectId: string, options?: AIRewriteOptions): Promise<AIRewriteResult>;
  
  /**
   * Perform a full resume audit against a Job Description using our calibrated endpoint.
   */
  auditResume(pdfFile: File | Blob, jobDescription?: string): Promise<any>;
  
  /**
   * Suggest keyword optimizations across selected document objects.
   */
  optimizeKeywords(objectIds: string[], missingKeywords: string[]): Promise<AIRewriteResult[]>;
}

export class AIIntegrationServiceImpl implements AIIntegrationService {
  async rewriteBullet(objectId: string, options?: AIRewriteOptions): Promise<AIRewriteResult> {
    const store = usePdfEditorStore.getState();
    const obj = store.objects[objectId];

    if (!obj || !obj.text || obj.text.trim() === '') {
      return {
        objectId,
        originalText: obj ? obj.text : '',
        rewrittenText: '',
        success: false,
        error: 'Target object is empty or invalid.',
      };
    }

    // Calculate maximum allowable character count based on box dimensions and font size
    const boxWidth = obj.boundingBox[2] - obj.boundingBox[0];
    const estimatedMaxChars = options?.maxChars || Math.max(30, Math.round((boxWidth / (obj.fontSize * 0.5)) * (obj.lineHeight || 1.2) * 2));

    try {
      const res = await fetch('/api/resume/rewrite-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: obj.text,
          font: obj.font,
          fontSize: obj.fontSize,
          maxChars: estimatedMaxChars,
          targetKeywords: options?.targetKeywords || [],
          tone: options?.tone || 'professional',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}: Failed to rewrite bullet.`);
      }

      const data = await res.json();
      const rewrittenText = data.rewrittenText;

      // Execute atomic AIRewriteCommand via History Engine
      // This ensures 50-step undo/redo support and atomic store updates
      const command = new AIRewriteCommand(objectId, obj.text, rewrittenText);
      historyEngine.execute(command);

      return {
        objectId,
        originalText: obj.text,
        rewrittenText,
        success: true,
      };
    } catch (err: any) {
      console.error('[AIService] Bullet rewrite failed:', err);
      return {
        objectId,
        originalText: obj.text,
        rewrittenText: obj.text,
        success: false,
        error: err.message || 'AI rewrite service error.',
      };
    }
  }

  async auditResume(pdfFile: File | Blob, jobDescription = ''): Promise<any> {
    const formData = new FormData();
    formData.append('file', pdfFile);
    if (jobDescription) {
      formData.append('jobDescription', jobDescription);
    }

    const res = await fetch('/api/resume/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}: ATS analysis failed.`);
    }

    return await res.json();
  }

  async optimizeKeywords(objectIds: string[], missingKeywords: string[]): Promise<AIRewriteResult[]> {
    if (!objectIds || objectIds.length === 0 || !missingKeywords || missingKeywords.length === 0) {
      return [];
    }

    const results: AIRewriteResult[] = [];
    const keywordsPerBullet = Math.ceil(missingKeywords.length / objectIds.length);

    for (let i = 0; i < objectIds.length; i++) {
      const id = objectIds[i];
      const sliceStart = i * keywordsPerBullet;
      const sliceEnd = sliceStart + keywordsPerBullet;
      const targetKeywords = missingKeywords.slice(sliceStart, sliceEnd);

      if (targetKeywords.length === 0) continue;

      const res = await this.rewriteBullet(id, {
        targetKeywords,
        tone: 'technical',
      });
      results.push(res);
    }

    return results;
  }
}

export const aiIntegrationService = new AIIntegrationServiceImpl();
