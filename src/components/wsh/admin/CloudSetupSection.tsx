'use client';

import { useState } from 'react';
import { Cloud, Wifi, WifiOff, Loader2 } from 'lucide-react';

export default function CloudSetupSection() {
  const [cloudProvider, setCloudProvider] = useState('none');
  const [cloudRegion, setCloudRegion] = useState('us-east-1');
  const [cloudConnected, setCloudConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTestConnection = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setCloudConnected(cloudProvider !== 'none');
    setLoading(false);
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      <span className="micro-label text-muted-foreground">Cloud Deployment Settings</span>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Provider
        </label>
        <select
          value={cloudProvider}
          onChange={(e) => { setCloudProvider(e.target.value); setCloudConnected(false); }}
          className="w-full px-3 py-2.5 rounded-xl text-xs bg-secondary/30 border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
        >
          <option value="none">None (Self-Hosted Only)</option>
          <option value="aws">Amazon Web Services (AWS)</option>
          <option value="gcp">Google Cloud Platform (GCP)</option>
          <option value="azure">Microsoft Azure</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Region
        </label>
        <select
          value={cloudRegion}
          onChange={(e) => setCloudRegion(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-xs bg-secondary/30 border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
        >
          <option value="us-east-1">US East (N. Virginia)</option>
          <option value="us-west-2">US West (Oregon)</option>
          <option value="eu-west-1">EU (Ireland)</option>
          <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Storage Type
        </label>
        <select className="w-full px-3 py-2.5 rounded-xl text-xs bg-secondary/30 border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground">
          <option value="local">Local Filesystem</option>
          <option value="s3">S3 Compatible</option>
          <option value="gcs">Google Cloud Storage</option>
          <option value="blob">Azure Blob Storage</option>
        </select>
      </div>

      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl border border-border/30">
        <div className="flex items-center gap-2">
          {cloudConnected ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-foreground">
            {cloudConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
        <div
          className={`w-2 h-2 rounded-full ${
            cloudConnected ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/30'
          }`}
        />
      </div>

      <button
        onClick={handleTestConnection}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-500/20 text-slate-300 border border-slate-500/30 hover:bg-slate-500/30 transition-all active:scale-95 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
        Test Connection
      </button>
    </div>
  );
}
