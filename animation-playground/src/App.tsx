import { useState } from 'react';
import ScannerAnimation from './components/ScannerAnimation';
import ApiKeyLeakAnimation from './components/ApiKeyLeakAnimation';
import AiConfidenceAnimation from './components/AiConfidenceAnimation';
import ScoreDashboardAnimation from './components/ScoreDashboardAnimation';
import NetworkTrafficAnimation from './components/NetworkTrafficAnimation';
import SecurityShieldAnimation from './components/SecurityShieldAnimation';
import VibeMatchAnimation from './components/VibeMatchAnimation';
import StoryBoard from './components/StoryBoard';
import {
  PlatformLogos,
  VulnerabilityVisuals,
  RapidCounter,
  ConsequenceIcons,
  ScannerRow,
  ActionableButton
} from './components/MicroAnimations';
import { Card } from './components/ui/Card';

function App() {
  const [mode, setMode] = useState<'grid' | 'story'>('story');

  if (mode === 'story') {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setMode('grid')}
            className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
          >
            View Animation Grid
          </button>
        </div>
        <StoryBoard />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 md:p-12 font-sans selection:bg-cyan-500/30">
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setMode('story')}
          className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-full hover:bg-emerald-500/20 transition-colors cursor-pointer"
        >
          View "The Story"
        </button>
      </div>

      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur text-xs font-medium text-zinc-400 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            VibeCheck Engine v1.0
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
            Animation Playground
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Interactive visualization of our core detection algorithms.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <Card title="Target Scanner" subtitle="Real-time vulnerability detection code scanning pattern.">
            <ScannerAnimation />
          </Card>

          <Card title="Credential & Secret Leak" subtitle="Heuristic analysis entering 'Panic Mode' upon detection.">
            <ApiKeyLeakAnimation />
          </Card>

          <Card title="AI Generation Confidence" subtitle="Probability distribution of synthetic code artifacts.">
            <AiConfidenceAnimation />
          </Card>

          <Card title="Vibe Score Dashboard" subtitle="Aggregate risk scoring and repo health metrics.">
            <ScoreDashboardAnimation />
          </Card>

          {/* New Premium Animations */}
          <Card title="Network Threat Analysis" subtitle="Real-time particle packet inspection and threat blocking.">
            <NetworkTrafficAnimation />
          </Card>

          <Card title="Active Protection Shield" subtitle="Dynamic heuristic defense layer assembly.">
            <SecurityShieldAnimation />
          </Card>

          <Card title="Vibe Pattern Matcher" subtitle="AI code fingerprinting and stylistic analysis.">
            <VibeMatchAnimation />
          </Card>

          <Card title="Micro Interactions" subtitle="High-fidelity UI details for the promo video.">
            <div className="flex flex-col gap-8 p-4">
              <div className="space-y-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Platform Logos</div>
                <PlatformLogos />
              </div>

              <div className="space-y-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Vulnerabilities</div>
                <div className="flex justify-around bg-zinc-900/50 p-4 rounded-xl">
                  <VulnerabilityVisuals index={0} />
                  <VulnerabilityVisuals index={1} />
                  <VulnerabilityVisuals index={2} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Rapid Counter</div>
                <div className="text-4xl font-mono text-center text-emerald-400 font-bold">
                  <RapidCounter value={150000} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Consequences</div>
                <div className="flex justify-around">
                  <ConsequenceIcons type="brand" />
                  <ConsequenceIcons type="money" />
                  <ConsequenceIcons type="startup" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Scanner Effect</div>
                <ScannerRow>
                  <div className="flex items-center gap-4 text-xl font-semibold">
                    <span>🚀</span>
                    <span>Production Ready</span>
                  </div>
                </ScannerRow>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Action Button</div>
                <ActionableButton />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default App
