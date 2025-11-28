"use client";
import { useState } from 'react';
import { Check } from 'lucide-react';

interface CheckoutStepsProps {
  currentStep: number;
}

const steps = [
  { number: 1, title: 'Order Details', description: 'Review your order' },
  { number: 2, title: 'Shipping Info', description: 'Where to send it' },
  { number: 3, title: 'Payment', description: 'Secure checkout' },
  { number: 4, title: 'Confirmation', description: 'Order complete' },
];

export default function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  return (
    <div className="mb-8">
      <div className="relative">
        {/* Progress Bar Background */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10" />
        
        {/* Active Progress Bar */}
        <div 
          className="absolute top-5 left-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500 -z-10"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }} // Dynamic step progress
        />

        {/* Steps */}
        <div className="flex justify-between">
          {steps.map((step) => {
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            const isUpcoming = currentStep < step.number;

            return (
              <div key={step.number} className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    isCompleted
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30'
                      : isCurrent
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-110'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : step.number}
                </div>

                {/* Step Info */}
                <div className="mt-3 text-center">
                  <div
                    className={`font-semibold text-sm transition-colors ${
                      isCurrent ? 'text-orange-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
