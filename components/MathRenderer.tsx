'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
// @ts-ignore: allow side-effect CSS import without type declarations
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && content) {
      try {
        // Clear previous content
        containerRef.current.innerHTML = '';

        // Split content by display math ($$...$$) and inline math ($...$)
        const parts = content.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);

        parts.forEach(part => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            // Display math
            const math = part.slice(2, -2);
            const span = document.createElement('div');
            span.className = 'my-4';
            katex.render(math, span, {
              throwOnError: false,
              displayMode: true,
            });
            containerRef.current?.appendChild(span);
          } else if (part.startsWith('$') && part.endsWith('$')) {
            // Inline math
            const math = part.slice(1, -1);
            const span = document.createElement('span');
            katex.render(math, span, {
              throwOnError: false,
              displayMode: false,
            });
            containerRef.current?.appendChild(span);
          } else if (part) {
            // Regular text
            const textNode = document.createTextNode(part);
            containerRef.current?.appendChild(textNode);
          }
        });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        // Fallback to plain text
        if (containerRef.current) {
          containerRef.current.textContent = content;
        }
      }
    }
  }, [content]);

  return <div ref={containerRef} className={`math-content ${className}`} />;
}
