import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { AnalysisStepper } from '../components/analysis/AnalysisStepper';
import { Button } from '../components/primitives/Button';
import { usePollGeneration } from '../hooks/usePollGeneration';
import { ProviderWarning } from '../components/common/ProviderWarning';
import { useAnalyzeRoom, useGenerateDesign, useActiveProvider } from '../api/queries';
import type { AnalyzeResponse } from '../api/types';
import { useUIStore } from '../store/uiStore';
import { logger } from '../lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

const STEPS = [
  'Analyzing room structure...',
  'Mapping spatial dimensions...',
  'Identifying furniture pieces...',
  'Extracting color palette...',
  'Synthesizing architectural features...',
  'Initializing Flux context...',
  'Generating photorealistic render...',
];

const STEP_DURATION_MS = 2500;

type WorkflowState = 'IDLE' | 'ANALYZING' | 'GENERATING' | 'COMPLETE' | 'ERROR';

export function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const customization = location.state?.customization || {};
  const { pendingFile, selectedStyleId } = useUIStore();

  const [workflowState, setWorkflowState] = useState<WorkflowState>('IDLE');
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [stepperDone, setStepperDone] = useState(false);
  const [generationId, setGenerationId] = useState<number | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const { data: activeProvider, isLoading: providerLoading } = useActiveProvider();
  const analyzeMutation = useAnalyzeRoom();
  const generateDesign = useGenerateDesign();
  const { setIsGenerating } = useUIStore();
  const queryClient = useQueryClient();
  const hasNavigated = useRef(false);

  const handleGenerationComplete = useCallback(async (gen: any) => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    
    logger.info('Generation completed. Invalidating caches and navigating.');
    setIsGenerating(false);
    
    await queryClient.invalidateQueries({ queryKey: ['history'] });
    if (gen.project_id) {
      await queryClient.invalidateQueries({ queryKey: ['project_timeline', gen.project_id] });
    }
    
    // Explicitly prefetch the final project/generation data before navigating
    await queryClient.prefetchQuery({
      queryKey: ['generation', gen.id],
      queryFn: () => api.get(`/history/${gen.id}`)
    });
    
    // Small buffer to avoid a race with eventual-consistency on the just-completed write
    await new Promise((r) => setTimeout(r, 400));
    
    setWorkflowState('COMPLETE');
    // Important: Route to the project ID, not the generation ID!
    navigate(`/results/${gen.project_id}`, { replace: true });
  }, [navigate, queryClient, setIsGenerating]);

  const { generation, isPending, isCompleted, isFailed } = usePollGeneration(generationId, handleGenerationComplete);

  const hasStartedWorkflow = useRef(false);

  const runWorkflow = async () => {
    try {
      setGenerateError(null);
      setIsGenerating(true);
      
      let currentAnalysisId = analysis?.analysis_id;
      
      if (!currentAnalysisId) {
        logger.info('Analyze started');
        setWorkflowState('ANALYZING');
        const analysisResult = await analyzeMutation.mutateAsync({ 
           image: pendingFile!, 
           style: selectedStyleId! 
        });
        logger.info('Analyze completed');
        setAnalysis(analysisResult);
        currentAnalysisId = analysisResult.analysis_id;
      }

      logger.info('Generate started');
      setWorkflowState('GENERATING');
      
      const genResult = await generateDesign.mutateAsync({ 
         analysisId: currentAnalysisId, 
         customization,
         force_new: true // Ensure we get a fresh attempt
      });
      setGenerationId(genResult.id);
    } catch (err) {
      setWorkflowState('ERROR');
      setIsGenerating(false);
      setGenerateError(err instanceof Error ? err.message : 'An error occurred during generation workflow');
    }
  };

  useEffect(() => {
    if (hasStartedWorkflow.current) return;
    if (providerLoading) return;
    
    if (activeProvider && !activeProvider.is_available) {
      return;
    }
    if (!pendingFile || !selectedStyleId) {
       return;
    }

    hasStartedWorkflow.current = true;
    runWorkflow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerLoading, activeProvider]);


  // Auto-advance stepper on a fixed cadence
  useEffect(() => {
    if (stepperDone || workflowState === 'IDLE' || workflowState === 'ERROR') return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= STEPS.length - 1) {
          clearInterval(interval);
          setStepperDone(true);
          return prev;
        }
        return prev + 1;
      });
    }, STEP_DURATION_MS);
    
    // Fast-forward if generation completes early
    if (workflowState === 'COMPLETE' || isCompleted || isFailed) {
      clearInterval(interval);
      setCurrentStep(STEPS.length - 1);
      setStepperDone(true);
    }
    
    return () => clearInterval(interval);
  }, [stepperDone, workflowState, isCompleted, isFailed]);



  // Handle background generation failure
  useEffect(() => {
    if (isFailed && generation?.error) {
      setWorkflowState('ERROR');
      setIsGenerating(false);
      setGenerateError(generation.error);
    }
  }, [isFailed, generation, setIsGenerating]);

  const handleRetry = () => {
    setGenerateError(null);
    setWorkflowState('IDLE');
    setGenerationId(null);
    setCurrentStep(0);
    setStepperDone(false);
    hasStartedWorkflow.current = false;
  };

  // If missing upload context, show redirect state
  if (!pendingFile || !selectedStyleId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center page-enter">
        <div className="h-16 w-16 rounded-2xl bg-surface-alt border border-border flex items-center justify-center mb-6 shadow-sm">
          <AlertTriangle className="h-7 w-7 text-text-tertiary" />
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">Session Expired</h1>
        <p className="text-base text-text-secondary mb-8 max-w-sm leading-relaxed">
          This analysis session has expired or the page was refreshed. Let's start a new design.
        </p>
        <Link to="/upload">
          <Button variant="primary" size="lg">Start New Design</Button>
        </Link>
      </div>
    );
  }

  // Missing provider state
  if (activeProvider && !activeProvider.is_available) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center page-enter">
        <ProviderWarning className="max-w-md mx-auto mb-6" />
      </div>
    );
  }

  // Error state
  if (workflowState === 'ERROR' || generateError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center page-enter">
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-danger-subtle border border-danger/20 mb-6 shadow-sm">
          <AlertTriangle className="h-7 w-7 text-danger" />
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">Generation Failed</h1>
        <p className="text-base text-text-secondary mb-1">
          We encountered an issue while generating your design.
        </p>
        {generateError && (
          <p className="text-sm text-text-tertiary mb-8 max-w-md bg-surface-alt p-3 rounded-lg border border-border mt-3">{generateError}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="primary" size="lg" onClick={handleRetry} icon={<RefreshCw className="h-4 w-4" />}>
            Try Again
          </Button>
          <Link to="/upload">
            <Button variant="secondary" size="lg" icon={<ArrowLeft className="h-4 w-4" />}>
              Back to Upload
            </Button>
          </Link>
        </div>
      </div>
    );
  }



  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-20 flex flex-col items-center page-enter min-h-[80vh] justify-center">
      
      {/* Fallback analysis notice */}
      {analysis?.room_type === 'Unknown' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 w-full rounded-xl bg-warning-subtle border border-warning/20 p-4 flex items-start gap-3 shadow-sm"
        >
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning mb-0.5">Partial Analysis</p>
            <p className="text-sm text-warning/80 leading-relaxed">
              We couldn't fully map this room automatically, but the AI will still attempt to generate a design based on the available visual context.
            </p>
          </div>
        </motion.div>
      )}

      {/* Hero / Header */}
      <div className="text-center mb-16 flex flex-col items-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-accent blur-xl opacity-20 rounded-full scale-150" />
          <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-surface border border-border shadow-md">
            {stepperDone && (isPending || workflowState === 'GENERATING' || workflowState === 'ANALYZING') ? (
               <Loader2 className="h-8 w-8 text-accent animate-spin" />
            ) : (
               <Sparkles className="h-8 w-8 text-accent animate-pulse" />
            )}
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-3">
          Crafting your design
        </h1>
        <p className="text-base text-text-secondary max-w-md">
          Please wait while our AI analyzes the architecture and generates a photorealistic render.
        </p>
      </div>

      {/* Stepper Area */}
      <div className="w-full max-w-md mx-auto mb-16">
        <AnalysisStepper steps={STEPS} currentIndex={currentStep} />
      </div>

      {/* Live extraction data */}
      <div className="w-full h-40">
        <AnimatePresence mode="wait">
          {currentStep >= 2 ? (
            <motion.div
              key="data-card"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="w-full rounded-2xl border border-border bg-surface p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                  Analysis Results
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {analysis && analysis.room_type !== 'Unknown' && (
                  <div>
                    <p className="text-xs text-text-tertiary mb-1">Detected Space</p>
                    <p className="text-sm font-medium text-text-primary">{analysis.room_type}</p>
                  </div>
                )}
                
                {currentStep >= 3 && (() => {
                  const objectCount = (analysis?.movable_objects?.length ?? 0) + (analysis?.built_in_objects?.length ?? 0);
                  return objectCount > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <p className="text-xs text-text-tertiary mb-1">Identified Objects</p>
                      <p className="text-sm font-medium text-text-primary">{objectCount} components mapped</p>
                    </motion.div>
                  );
                })()}
                
                {currentStep >= 4 && analysis?.budget_summary?.grand_total && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-2">
                    <p className="text-xs text-text-tertiary mb-1">Estimated Renovation Budget</p>
                    <p className="text-sm font-medium text-text-primary">${analysis.budget_summary.grand_total.min ?? 0}–${analysis.budget_summary.grand_total.max ?? 0}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
             <div key="empty" className="w-full h-full" />
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
