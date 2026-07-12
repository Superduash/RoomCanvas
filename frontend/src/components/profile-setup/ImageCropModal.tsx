import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../primitives/Button';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { getCroppedImg } from '../../utils/cropImage';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

export function ImageCropModal({ isOpen, imageSrc, onClose, onCropComplete }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-border"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Adjust Photo</h3>
              <button
                onClick={onClose}
                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg rounded-md transition-colors focus-visible:outline-none focus-visible:shadow-focus"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="relative w-full h-[350px] bg-bg/50">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropCompleteHandler}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <ZoomOut size={20} className="text-text-secondary flex-shrink-0" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-label="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <ZoomIn size={20} className="text-text-secondary flex-shrink-0" />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSave} loading={isProcessing}>
                  Save Photo
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
