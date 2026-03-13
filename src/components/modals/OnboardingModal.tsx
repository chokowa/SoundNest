import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface OnboardingModalProps {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: "slide1",
      backgroundImage: "/SoundNest/images/onboarding/player.png",
      illustration: "/SoundNest/images/onboarding/masking.png",
      accent: "from-blue-500/10 to-indigo-500/10"
    },
    {
      id: "slide2",
      backgroundImage: "/SoundNest/images/onboarding/mixer.png",
      illustration: "/SoundNest/images/onboarding/blend.png",
      accent: "from-emerald-500/10 to-teal-500/10"
    },
    {
      id: "slide3",
      backgroundImage: "/SoundNest/images/onboarding/sounds.png",
      illustration: "/SoundNest/images/onboarding/battery.png",
      accent: "from-orange-500/10 to-amber-500/10"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-500">
      <div className="relative w-full max-w-lg mx-4 overflow-hidden bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl transition-all duration-500">
        
        {/* 背景画像 (控えめなブラー & オーバーレイ) */}
        <div className="absolute inset-0 z-0 opacity-30">
          <img 
            src={step.backgroundImage} 
            alt="Background UI" 
            className="w-full h-full object-cover blur-[2px] scale-105 transition-all duration-700"
          />
          <div className={`absolute inset-0 bg-gradient-to-b ${step.accent} mix-blend-multiply`} />
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 p-8 pt-10 text-center flex flex-col items-center">
          
          {/* インジケーター */}
          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-10 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'w-2 bg-neutral-200 dark:bg-neutral-800'
                }`}
              />
            ))}
          </div>

          {/* イラストエリア */}
          <div className="w-full aspect-[4/3] max-h-[200px] mb-8 flex items-center justify-center animate-in zoom-in-95 duration-500">
            <img 
              src={step.illustration} 
              alt="Illustration" 
              className="max-w-full max-h-full object-contain drop-shadow-2xl"
            />
          </div>

          <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-white transition-all duration-500 tracking-tight">
            {t(`onboarding.${step.id}.title`)}
          </h2>
          
          <div className="min-h-[100px] flex items-center justify-center px-4">
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-[15px] lg:text-base">
              {t(`onboarding.${step.id}.description`)}
            </p>
          </div>

          <button
            onClick={handleNext}
            className="mt-10 w-full py-4.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-lg active:scale-[0.98] transition-all shadow-xl hover:opacity-95"
            style={{ paddingTop: '1.125rem', paddingBottom: '1.125rem' }}
          >
            {currentStep === steps.length - 1 ? t('onboarding.start') : t('onboarding.next')}
          </button>
        </div>
      </div>
    </div>
  );
};
