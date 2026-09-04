// components/overview/ZoomableDiagram.tsx
"use client";

import { useState } from "react";

export default function ZoomableDiagram({ src, alt }: { src: string; alt: string }) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <div 
        className="relative w-full rounded-xl border border-border/60 bg-background/30 p-2 overflow-hidden cursor-zoom-in group"
        onClick={() => setIsZoomed(true)}
      >
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-auto rounded-lg object-contain opacity-80 group-hover:opacity-100 transition-all duration-500 ease-in-out group-hover:scale-[1.02]" 
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/80 backdrop-blur-sm border border-border px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <span className="text-xs font-mono text-primary flex items-center gap-2">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
            CLICK TO ZOOM
          </span>
        </div>
      </div>

      {isZoomed && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-md cursor-zoom-out p-4 md:p-10"
          onClick={() => setIsZoomed(false)}
        >
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200" 
          />
          <div className="absolute top-6 right-6 bg-surface border border-border px-4 py-2 rounded-full text-xs font-mono text-muted">
            CLICK ANYWHERE TO CLOSE
          </div>
        </div>
      )}
    </>
  );
}