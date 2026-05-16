import { Link } from 'react-router-dom';
import { Shield, Activity, ArrowRight, CheckCircle2, Cpu, Globe, Fingerprint, ChevronRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-50 font-sans selection:bg-brand-500/30 overflow-hidden relative flex flex-col">
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(-6deg); }
          50% { transform: translateY(-15px) rotate(-4deg); }
          100% { transform: translateY(0px) rotate(-6deg); }
        }
        @keyframes float-delayed {
          0% { transform: translateY(0px) rotate(3deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(3deg); }
        }
        .animate-float-slow { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite; animation-delay: 1s; }
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        @keyframes fadeInUp {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern" style={{ maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)' }}></div>
        <div className="absolute left-0 right-0 top-[-10%] m-auto h-[400px] w-[600px] rounded-full bg-brand-600 opacity-20 blur-[120px]"></div>
        <div className="absolute right-[-10%] top-[20%] h-[300px] w-[300px] rounded-full bg-violet-600 opacity-20 blur-[100px]"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-50 w-full border-b border-white/5 bg-[#030712]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              FraudGuard <span className="text-brand-400">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
              <a href="#features" className="hover:text-white transition-colors">Platform</a>
              <a href="#features" className="hover:text-white transition-colors">Solutions</a>
              <a href="#features" className="hover:text-white transition-colors">Developers</a>
            </div>
            <div className="flex items-center gap-4 ml-4">
              <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="px-4 py-2 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg backdrop-blur-md transition-all shadow-lg">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center">
        
        {/* Hero Section */}
        <section className="w-full max-w-7xl mx-auto px-6 pt-24 pb-32 text-center relative flex flex-col items-center justify-center min-h-[75vh]">
          
          <div className="fade-in-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-bold uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            Fraud Operations Center v2.0 Live
          </div>
          
          <h1 className="fade-in-up text-5xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl mx-auto leading-[1.1]" style={{ animationDelay: '0.1s' }}>
            Detect the invisible. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-violet-400 to-brand-400 bg-[length:200%_auto] animate-pulse">
              Prevent the impossible.
            </span>
          </h1>
          
          <p className="fade-in-up text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed" style={{ animationDelay: '0.2s' }}>
            Enterprise-grade transaction monitoring and device fingerprinting. Powered by state-of-the-art ML ensembles to stop fraud in under 50ms.
          </p>

          <div className="fade-in-up flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto" style={{ animationDelay: '0.3s' }}>
            <Link to="/register" className="group px-8 py-4 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-500 transition-all shadow-[0_0_40px_-10px_rgba(99,102,241,0.6)] flex items-center justify-center gap-2 w-full">
              Start Monitoring <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features" className="px-8 py-4 text-sm font-bold text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center w-full backdrop-blur-md">
              View API Docs
            </a>
          </div>



        </section>

        {/* Social Proof */}
        <section className="w-full border-y border-white/5 bg-white/[0.01] py-10 relative z-10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Trusted by security-first engineering teams</p>
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-40 grayscale">
              {['Acme Corp', 'GlobalBank', 'FintechX', 'NeoPay', 'SecureNet'].map(name => (
                <span key={name} className="text-xl font-bold font-serif tracking-tight">{name}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="w-full max-w-7xl mx-auto px-6 py-32 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white">A complete fraud intelligence platform</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">Everything you need to detect anomalies, investigate threats, and protect your revenue with military-grade precision.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-brand-500/30 transition-all duration-500 overflow-hidden hover:shadow-[0_0_40px_rgba(99,102,241,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-b from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mb-8 ring-1 ring-brand-500/20 group-hover:scale-110 group-hover:bg-brand-500/20 transition-all duration-500">
                  <Activity className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Millisecond Latency</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                  Evaluate complex ML ensembles and hundreds of risk rules in under 50ms. Designed for high-throughput enterprise scale.
                </p>
                <ul className="space-y-3">
                  {['< 50ms P99 Latency', 'Distributed Edge Computing', 'Zero-downtime Updates'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-xs font-medium text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-brand-400" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 transition-all duration-500 overflow-hidden hover:shadow-[0_0_40px_rgba(139,92,246,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-8 ring-1 ring-violet-500/20 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all duration-500">
                  <Cpu className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Explainable AI Engine</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                  Don't just block a transaction. Get SHAP-powered risk insights detailing exactly which features triggered the alert.
                </p>
                <ul className="space-y-3">
                  {['Feature Importance Scoring', 'Decision Tree Visualizations', 'Clear Analyst Summaries'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-xs font-medium text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-violet-400" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 transition-all duration-500 overflow-hidden hover:shadow-[0_0_40px_rgba(16,185,129,0.1)]">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-8 ring-1 ring-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-500">
                  <Globe className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Global Graph Network</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                  Detect multi-hop fraud rings by connecting entities across IP addresses, device IDs, and payment methods globally.
                </p>
                <ul className="space-y-3">
                  {['Cross-merchant Intelligence', 'Device Fingerprinting', 'Velocity Anomaly Detection'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-xs font-medium text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full max-w-5xl mx-auto px-6 py-20 mb-20 relative z-10">
           <div className="absolute inset-0 bg-gradient-to-r from-brand-600/20 to-violet-600/20 rounded-[3rem] blur-2xl pointer-events-none" />
           <div className="relative bg-[#0a0a0a]/80 border border-white/10 rounded-[3rem] p-12 md:p-20 text-center backdrop-blur-xl shadow-2xl">
             <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Ready to secure your platform?</h2>
             <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">Join the leading financial institutions using FraudGuard to stop bad actors before they strike. Integrate in minutes.</p>
             <Link to="/register" className="inline-flex items-center justify-center gap-2 px-10 py-5 text-sm font-bold text-black bg-white rounded-2xl hover:bg-slate-200 transition-colors shadow-xl">
               Create Developer Account <ChevronRight className="w-5 h-5" />
             </Link>
           </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-black py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
            <Shield className="h-6 w-6 text-white" />
            <span className="font-bold tracking-tight text-white text-lg">FraudGuard AI</span>
          </div>
          <p className="text-sm font-medium text-slate-600">&copy; {new Date().getFullYear()} FraudGuard Intelligence. All rights reserved.</p>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
