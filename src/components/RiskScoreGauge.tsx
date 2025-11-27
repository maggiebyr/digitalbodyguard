"use client";

import { useMemo } from "react";

interface RiskScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function RiskScoreGauge({ score, size = "md" }: RiskScoreGaugeProps) {
  const { level, color, bgColor, label } = useMemo(() => {
    if (score >= 75) {
      return {
        level: "critical",
        color: "text-red-600",
        bgColor: "bg-red-100",
        label: "CRITICAL RISK",
      };
    }
    if (score >= 50) {
      return {
        level: "high",
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        label: "HIGH RISK",
      };
    }
    if (score >= 25) {
      return {
        level: "medium",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        label: "MEDIUM RISK",
      };
    }
    return {
      level: "low",
      color: "text-green-600",
      bgColor: "bg-green-100",
      label: "LOW RISK",
    };
  }, [score]);

  const dimensions = useMemo(() => {
    switch (size) {
      case "sm":
        return { width: 120, strokeWidth: 8, fontSize: "text-2xl" };
      case "lg":
        return { width: 200, strokeWidth: 12, fontSize: "text-5xl" };
      default:
        return { width: 160, strokeWidth: 10, fontSize: "text-4xl" };
    }
  }, [size]);

  const radius = (dimensions.width - dimensions.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative ${bgColor} rounded-full p-4`}
        style={{ width: dimensions.width + 32, height: dimensions.width + 32 }}
      >
        <svg
          width={dimensions.width}
          height={dimensions.width}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={dimensions.width / 2}
            cy={dimensions.width / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={dimensions.strokeWidth}
            fill="none"
            className="text-slate-200"
          />
          {/* Progress circle */}
          <circle
            cx={dimensions.width / 2}
            cy={dimensions.width / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={dimensions.strokeWidth}
            fill="none"
            className={color}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${dimensions.fontSize} font-bold ${color}`}>
            {score}
          </span>
        </div>
      </div>
      <span className={`mt-3 font-semibold ${color}`}>{label}</span>
    </div>
  );
}
