import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Sparkles, Zap, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[92vh] text-center px-4 relative overflow-hidden bg-[#050505] text-white selection:bg-indigo-500/30">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-[120px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-[500px] bg-gradient-to-tr from-blue-900/20 to-transparent blur-[130px] -z-10 pointer-events-none"></div>
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-fuchsia-600/10 to-transparent blur-[100px] -z-10 pointer-events-none"></div>

      {/* Hero Section */}
      <div className="space-y-8 max-w-4xl z-10 pt-1 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-slate-300 text-sm font-medium mb-2 backdrop-blur-md cursor-default hover:bg-white/[0.08] transition-colors shadow-2xl">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Powered by Grok AI Engine</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-white drop-shadow-2xl leading-[1.1]">
          Find Your Perfect Role with <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Intelligent Precision.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl leading-relaxed text-slate-400 font-light max-w-2xl mx-auto tracking-wide">
          Upload your resume and let our state-of-the-art AI match you with exclusive opportunities. Experience the future of recruitment—fast, highly accurate, and beautifully seamless.
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-5 mt-14 z-10 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
        <Link href="/jobs">
          <Button 
            className="w-full sm:w-auto h-14 px-8 text-base font-semibold bg-white text-black hover:bg-slate-200 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] rounded-full cursor-pointer flex items-center gap-2 group"
          >
            Browse Opportunities <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        <Link href="/register">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto h-14 px-8 text-base font-semibold border border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md transition-all hover:-translate-y-1 hover:border-white/40 rounded-full cursor-pointer"
          >
            Create an Account
          </Button>
        </Link>
      </div>

      {/* Decorative Features Section */}
      <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl z-10 pb-20 px-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
        {[
          { icon: <Zap className="w-6 h-6 text-amber-400 mb-4" />, title: "Smart Matching", desc: "Our AI scans your resume to match skills precisely with job requirements." },
          { icon: <Sparkles className="w-6 h-6 text-purple-400 mb-4" />, title: "Real-Time Updates", desc: "Get instant notifications the moment your match score is calculated." },
          { icon: <ShieldCheck className="w-6 h-6 text-emerald-400 mb-4" />, title: "Recruiter Dashboard", desc: "Seamlessly post jobs and instantly rank applicants by AI fit score." }
        ].map((feature, i) => (
          <div key={i} className="group bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] p-8 rounded-3xl shadow-2xl hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 cursor-default text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            {feature.icon}
            <h3 className="text-xl font-semibold text-white mb-3 tracking-wide">{feature.title}</h3>
            <p className="text-slate-400 leading-relaxed font-light">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
