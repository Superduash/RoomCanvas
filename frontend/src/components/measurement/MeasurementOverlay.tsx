import React, { useRef, useState, useEffect } from 'react';
import { Button } from '../primitives/Button';
import { api } from '../../api/client';
import { toast } from '../../lib/toast';
import { getFriendlyApiError } from '../../utils/errors';

export interface Point2D {
  x: number;
  y: number;
}

interface MeasurementOverlayProps {
  originalImageUrl: string;
  generatedImageUrl: string | null;
  imageId: number;
  onClose: () => void;
  onMeasurementComplete?: (result: any) => void;
}

type Mode = 'reference' | 'target' | 'done';

export function MeasurementOverlay({ originalImageUrl, generatedImageUrl, imageId, onClose, onMeasurementComplete }: MeasurementOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [mode, setMode] = useState<Mode>('reference');
  const [referenceType, setReferenceType] = useState<string>('credit_card');
  const [refPoints, setRefPoints] = useState<Point2D[]>([]);
  const [targetPoints, setTargetPoints] = useState<Point2D[]>([]);
  const [result, setResult] = useState<any>(null);
  const [customLength, setCustomLength] = useState<number | ''>('');
  const [customUnit, setCustomUnit] = useState<'cm' | 'inches'>('cm');
  const [activeSource, setActiveSource] = useState<'original' | 'latest'>('original');

  const imageUrl = activeSource === 'latest' && generatedImageUrl ? generatedImageUrl : originalImageUrl;

  useEffect(() => {
    handleReset();
  }, [activeSource]);

  useEffect(() => {
    drawCanvas();
  }, [refPoints, targetPoints, mode]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw reference points
    if (refPoints.length > 0) {
      ctx.strokeStyle = '#3C7A52'; // success color
      ctx.fillStyle = '#3C7A52';
      ctx.lineWidth = 2;
      
      refPoints.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      if (refPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(refPoints[0].x, refPoints[0].y);
        for (let i = 1; i < refPoints.length; i++) {
          ctx.lineTo(refPoints[i].x, refPoints[i].y);
        }
        if (refPoints.length === 4) {
          ctx.closePath();
        }
        ctx.stroke();
      }
    }

    // Draw target points
    if (targetPoints.length > 0) {
      ctx.strokeStyle = '#B76E4D'; // accent color
      ctx.fillStyle = '#B76E4D';
      ctx.lineWidth = 2;
      
      targetPoints.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      if (targetPoints.length === 2) {
        ctx.beginPath();
        ctx.moveTo(targetPoints[0].x, targetPoints[0].y);
        ctx.lineTo(targetPoints[1].x, targetPoints[1].y);
        ctx.stroke();
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    if (mode === 'reference') {
      if (refPoints.length < 4) {
        const newPoints = [...refPoints, { x, y }];
        setRefPoints(newPoints);
        if (newPoints.length === 4) {
          setMode('target');
        }
      }
    } else if (mode === 'target' || mode === 'done') {
      let currentTargets = targetPoints;
      if (currentTargets.length === 2) {
        currentTargets = [];
        setResult(null);
        setMode('target');
      }
      const newPoints = [...currentTargets, { x, y }];
      setTargetPoints(newPoints);
      if (newPoints.length === 2) {
        setMode('done');
        measureDistance(refPoints, newPoints);
      }
    }
  };

  const handleUndo = () => {
    if (mode === 'reference' && refPoints.length > 0) {
      setRefPoints(prev => prev.slice(0, -1));
    } else if ((mode === 'target' || mode === 'done') && targetPoints.length > 0) {
      setTargetPoints(prev => prev.slice(0, -1));
      setResult(null);
      setMode('target');
    }
  };

  const measureDistance = async (refs: Point2D[], targets: Point2D[]) => {
    try {
      let custom_reference_length_cm = undefined;
      if (referenceType === 'custom') {
        if (!customLength) throw new Error("Please enter a custom length.");
        custom_reference_length_cm = customUnit === 'inches' ? Number(customLength) * 2.54 : Number(customLength);
      }
      
      const res = await api.post('/measure', {
        image_id: imageId,
        reference_object_type: referenceType,
        reference_corners: refs,
        reference_edge: 'height',
        target_points: targets,
        custom_reference_length_cm
      });
      setResult(res);
      if (onMeasurementComplete) {
        onMeasurementComplete(res);
      }
    } catch (err: any) {
      toast.error(getFriendlyApiError(err, 'Failed to measure distance.'));
      setMode('target');
      setTargetPoints([]);
    }
  };

  const handleReset = () => {
    setRefPoints([]);
    setTargetPoints([]);
    setResult(null);
    setMode('reference');
  };

  // Image onLoad sets canvas dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (canvasRef.current) {
      canvasRef.current.width = img.naturalWidth;
      canvasRef.current.height = img.naturalHeight;
      drawCanvas();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg/95 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-surface">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-text-primary">Measure Room Dimensions</h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            {mode === 'reference' && 'Step 1: Tap the 4 corners of the reference object (TL, TR, BR, BL).'}
            {mode === 'target' && 'Step 2: Tap two points to measure a distance.'}
            {mode === 'done' && 'Measurement complete.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {generatedImageUrl && (
            <div className="flex rounded-lg border border-border p-1 bg-surface-subtle">
              <button 
                onClick={() => setActiveSource('original')} 
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeSource === 'original' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Original
              </button>
              <button 
                onClick={() => setActiveSource('latest')} 
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeSource === 'latest' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Latest Version
              </button>
            </div>
          )}
          {mode === 'reference' && (
            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={referenceType}
                onChange={e => setReferenceType(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-md text-sm bg-surface"
              >
                <option value="credit_card">Credit Card (8.56cm)</option>
                <option value="a4_paper">A4 Paper (29.7cm)</option>
                <option value="standard_door">Standard Door (203cm)</option>
                <option value="custom">Custom</option>
              </select>
              
              {referenceType === 'custom' && (
                <>
                  <input 
                    type="number" 
                    value={customLength} 
                    onChange={e => setCustomLength(e.target.value === '' ? '' : Number(e.target.value))} 
                    className="px-3 py-1.5 border border-border rounded-md text-sm bg-surface w-24"
                    placeholder="Length"
                  />
                  <select 
                    value={customUnit}
                    onChange={e => setCustomUnit(e.target.value as 'cm' | 'inches')}
                    className="px-2 py-1.5 border border-border rounded-md text-sm bg-surface"
                  >
                    <option value="cm">cm</option>
                    <option value="inches">in</option>
                  </select>
                </>
              )}
            </div>
          )}
          <Button 
            variant="secondary" 
            onClick={handleUndo}
            disabled={(mode === 'reference' && refPoints.length === 0) || (mode !== 'reference' && targetPoints.length === 0)}
          >
            Undo
          </Button>
          <Button variant="secondary" onClick={handleReset}>Reset</Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative" ref={containerRef}>
        <div className="relative inline-block max-w-full max-h-full">
          <img 
            src={imageUrl} 
            alt="Room to measure" 
            onLoad={handleImageLoad}
            className="block max-w-full h-auto max-h-[80vh] shadow-lg rounded-md select-none"
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="absolute top-0 left-0 w-full h-full cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>

      {result && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface p-4 rounded-xl shadow-xl border border-border text-center flex flex-col gap-1 min-w-[200px]">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Distance</span>
          <span className="text-2xl font-bold text-text-primary">{result.real_distance_cm.toFixed(1)} cm</span>
          <span className="text-sm font-medium text-text-secondary">{result.real_distance_inches.toFixed(1)} inches</span>
        </div>
      )}
    </div>
  );
}
