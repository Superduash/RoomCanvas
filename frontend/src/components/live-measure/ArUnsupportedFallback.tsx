import { AlertTriangle, ArrowLeft, Camera, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../primitives/Button';
import { motion } from 'framer-motion';

export function ArUnsupportedFallback() {
  return (
    <div className="flex min-h-[calc(100vh-100px)] flex-col items-center justify-center gap-4 px-6 text-center bg-bg w-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md mx-auto w-full flex flex-col items-center"
      >
        <div className="w-20 h-20 bg-surface-raised rounded-full flex items-center justify-center mb-6 shadow-sm border border-border">
          <Smartphone size={36} strokeWidth={1.5} className="text-text-secondary" aria-hidden="true" />
          <div className="absolute top-0 right-0 -mr-2 -mt-2 bg-warning/10 rounded-full p-1.5 border border-warning/20">
            <AlertTriangle size={18} strokeWidth={2} className="text-warning" aria-hidden="true" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-text-primary mb-3">AR Not Supported</h1>
        
        <p className="text-[15px] text-text-secondary mb-8 leading-relaxed max-w-sm">
          Live AR Measurement requires an Android device using a WebXR-compatible browser (like Google Chrome). 
          <br/><br/>
          Unfortunately, iOS Safari and desktop browsers do not currently support this immersive feature.
        </p>
        
        <div className="flex flex-col gap-3 w-full">
          <Link to="/" className="w-full">
            <Button variant="primary" className="w-full shadow-md hover:shadow-lg transition-shadow" icon={<Camera size={18} />}>
              Use Photo Measure
            </Button>
          </Link>
          <Link to="/" className="w-full">
            <Button variant="ghost" className="w-full" icon={<ArrowLeft size={16} />}>
              Back to Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
