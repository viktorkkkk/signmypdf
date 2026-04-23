'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Keep in sync with ArticleTool in app/blog/[slug]/BlogPostContent.tsx
type Tool = 'sign' | 'fill' | 'protect';

interface BlogPdfUploaderProps {
  /** Which tool the article is about — determines upload target route. */
  tool?: Tool;
  /** @deprecated Use `tool="fill"` instead. Kept for any stale callers. */
  isFill?: boolean;
}

const ROUTE: Record<Tool, string> = {
  sign: '/',
  fill: '/fill',
  protect: '/protect',
};

export default function BlogPdfUploader({ tool, isFill }: BlogPdfUploaderProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);

  const resolvedTool: Tool = tool ?? (isFill ? 'fill' : 'sign');
  const targetRoute = ROUTE[resolvedTool];

  const handleFile = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    // Store file in localStorage for the main app to pick up
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      localStorage.setItem('blog_pending_pdf', base64);
      localStorage.setItem('blog_pending_pdf_name', file.name);
      router.push(targetRoute);
    };
    reader.readAsDataURL(file);
  }, [router, targetRoute]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        border: `2px dashed ${isDragging ? '#2563eb' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
        padding: '32px 24px',
        background: isDragging ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => document.getElementById('blog-file-input')?.click()}
    >
      <input
        id="blog-file-input"
        type="file"
        accept=".pdf"
        onChange={onFileSelect}
        style={{ display: 'none' }}
      />
      <div style={{
        width: 56,
        height: 56,
        background: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <p style={{
        fontSize: 16,
        fontWeight: 600,
        color: 'white',
        marginBottom: 8,
      }}>
        Drop your PDF here or click to browse
      </p>
      <p style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
      }}>
        Supports PDF files up to 10MB
      </p>
    </div>
  );
}
