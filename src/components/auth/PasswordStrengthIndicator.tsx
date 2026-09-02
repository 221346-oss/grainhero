import React from "react";
import {
  getPasswordStrengthColor,
  getPasswordStrengthText,
  type PasswordStrength,
} from "@/lib/validation";

interface Props {
  strength: PasswordStrength;
  showFeedback?: boolean;
}

export const PasswordStrengthIndicator: React.FC<Props> = ({ strength, showFeedback = true }) => {
  const widthClasses = ["w-0", "w-1/4", "w-2/4", "w-3/4", "w-full"];
  const clampedScore = Math.max(0, Math.min(widthClasses.length - 1, Math.round(strength.score)));
  const progressWidthClass = widthClasses[clampedScore];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${progressWidthClass} ${getPasswordStrengthColor(strength.score)}`}
          />
        </div>
        <span className="text-xs font-medium text-gray-600 min-w-[60px]">
          {getPasswordStrengthText(strength.score)}
        </span>
      </div>
      {showFeedback && strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.map((req, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <span>{req}</span>
            </div>
          ))}
        </div>
      )}
      {strength.isValid && (
        <div className="flex items-center gap-2 text-xs text-green-600">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>Strong password!</span>
        </div>
      )}
    </div>
  );
};
