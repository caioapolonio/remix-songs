"use client";

const BAR_COUNT = 9;
const delays = [0, 0.15, 0.3, 0.1, 0.25, 0.05, 0.2, 0.35, 0.12];

export function SoundWave() {
  return (
    <div className="flex items-center justify-center gap-1 h-10">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          className="w-1 h-full rounded-full bg-primary animate-[sound-wave_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: `${delays[i]}s` }}
        />
      ))}
    </div>
  );
}
