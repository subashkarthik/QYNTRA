import React, { useState, useRef } from 'react';
import { ImageAttachment } from '../types';
import { visionService } from '../services/visionService';

interface ImageUploadProps {
  onImagesSelected: (images: ImageAttachment[]) => void;
  maxImages?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImagesSelected, maxImages = 5 }) => {
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setIsProcessing(true);
    const newImages: ImageAttachment[] = [];

    try {
      for (let i = 0; i < Math.min(files.length, maxImages - images.length); i++) {
        const file = files[i];
        try {
          // Compress if needed
          let processedFile = file;
          if (file.size > 5 * 1024 * 1024) { // If larger than 5MB
            processedFile = await visionService.compressImage(file);
          }

          const imageAttachment = await visionService.createImageAttachment(processedFile);
          newImages.push(imageAttachment);
        } catch (error: any) {
          console.error(`Failed to process ${file.name}:`, error);
          alert(`Failed to process ${file.name}: ${error.message}`);
        }
      }

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onImagesSelected(updatedImages);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (id: string) => {
    const updatedImages = images.filter(img => img.id !== id);
    setImages(updatedImages);
    onImagesSelected(updatedImages);
  };

  const clearAll = () => {
    setImages([]);
    onImagesSelected([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-brand-accent bg-brand-accent/10'
              : 'border-white/20 hover:border-brand-accent/50 hover:bg-white/5'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400">Processing images...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-accent">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                  <circle cx="9" cy="9" r="2"></circle>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-300 font-medium">
                  Drop images here or click to browse
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  PNG, JPEG, WebP up to 20MB ({maxImages - images.length} remaining)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Selected Images ({images.length}/{maxImages})
            </p>
            <button
              onClick={clearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={`data:${image.mimeType};base64,${image.data}`}
                  alt={image.name}
                  className="w-full h-32 object-cover rounded-lg border border-white/10"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <button
                    onClick={() => removeImage(image.id)}
                    className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div className="absolute bottom-1 left-1 right-1 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
                  <p className="text-xs text-white truncate">{image.name}</p>
                  <p className="text-xs text-slate-400">{(image.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
