"use client";

import React, { useState } from "react";
import PixelSnow from "../animations/PixelSnow";
import { BackgroundBeamsWithCollision } from "../animations/BackgroundBeamsWithCollision";
import { CloudRain, Snowflake } from "lucide-react";

// ==========================================
// Standalone Custom UI Components (Shadcn Fallback)
// ==========================================

const Card = ({ className, children, ...props }) => (
  <div className={`rounded-xl border border-white/10 bg-slate-900 text-card-foreground shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

const CardContent = ({ className, children, ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

const Tabs = ({ defaultValue, className, children }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (!child) return null;
        return React.cloneElement(child, { activeTab, setActiveTab });
      })}
    </div>
  );
};

const TabsList = ({ className, children, activeTab, setActiveTab }) => {
  return (
    <div className={`inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 p-1 text-slate-400 ${className}`}>
      {React.Children.map(children, child => {
        if (!child) return null;
        return React.cloneElement(child, { activeTab, setActiveTab });
      })}
    </div>
  );
};

const TabsTrigger = ({ value, className, children, activeTab, setActiveTab }) => {
  const isActive = activeTab === value;
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-5 py-2 text-sm font-medium transition-all focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 ${
        isActive 
          ? "bg-slate-900 text-white shadow-xs" 
          : "text-slate-400 hover:text-slate-200"
      } ${className}`}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, className, children, activeTab }) => {
  if (activeTab !== value) return null;
  return <div className={className}>{children}</div>;
};

// ==========================================
// Main Component
// ==========================================

const TabsDemo = () => {
  return (
    <Tabs defaultValue="winter" className="w-full max-w-2xl">
      <TabsList className="h-auto rounded-xl p-0.5">
        <TabsTrigger
          value="winter"
          className="rounded-lg px-5 py-2 cursor-pointer text-foreground dark:data-active:bg-background"
        >
          Winter
        </TabsTrigger>
        <TabsTrigger
          value="monsoon"
          className="rounded-lg px-5 py-2 cursor-pointer text-foreground dark:data-active:bg-background"
        >
          Monsoon
        </TabsTrigger>
      </TabsList>

      <TabsContent value="winter">
        <Card className="relative min-h-90 w-full overflow-hidden rounded-2xl border-none bg-linear-to-b from-slate-950 via-slate-900 to-slate-800 sm:min-h-105">
          <div className="absolute inset-0">
            <PixelSnow
              color="#ffffff"
              flakeSize={0.02}
              minFlakeSize={1.25}
              pixelResolution={500}
              speed={0.5}
              density={0.3}
              direction={95}
              brightness={1}
              depthFade={20}
              farPlane={20}
              gamma={0.4545}
              variant="round"
            />
          </div>
          <CardContent className="relative z-10 flex h-full flex-col items-center justify-center gap-3 p-8 text-center" style={{ minHeight: "360px" }}>
            <Snowflake className="size-8 text-white/90" />
            <h3 className="text-2xl font-semibold text-white">Winter</h3>
            <p className="max-w-sm text-sm text-white/70">
              Soft pixel snowfall drifting across a cold winter sky.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="monsoon">
        <Card className="relative min-h-90 w-full overflow-hidden rounded-2xl border-none bg-linear-to-b from-slate-950 via-cyan-950 to-slate-900 p-0 sm:min-h-105">
          <BackgroundBeamsWithCollision
            className="h-90 sm:h-105"
            beamCount={14}
            colors={["#22d3ee", "#38bdf8", "#a5f3fc"]}
            speed={1.4}
            travelDistance={420}
          >
            <CardContent className="relative z-10 flex h-full flex-col items-center justify-center gap-3 p-8 text-center" style={{ minHeight: "360px" }}>
              <CloudRain className="size-8 text-white/90" />
              <h3 className="text-2xl font-semibold text-white">Monsoon</h3>
              <p className="max-w-sm text-sm text-white/70">
                Streaks of rain fall and burst into light where they land.
              </p>
            </CardContent>
          </BackgroundBeamsWithCollision>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default TabsDemo;
