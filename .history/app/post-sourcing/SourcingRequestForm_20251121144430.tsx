'use client';

import { useState } from 'react';
import { Upload, Package, DollarSign, Clock, FileText, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

type FormStep = 1 | 2 | 3 | 4;

interface SourcingFormData {
  // Step 1: Product Details
  productName: string;
  productDescription: string;
  category: string;
  specifications: string;
  
  // Step 2: Quantity & Pricing
  quantity: string;
  targetPrice: string;
  currency: string;
  
  // Step 3: Timeline & Delivery
  timeline: string;
  deliveryAddress: string;
  country: string;
  
  // Step 4: Additional Info
  additionalNotes: string;
  files: File[];
}

const categories = [
  'Electronics & Technology',
  'Fashion & Apparel',
  'Home & Garden',
  'Beauty & Personal Care',
  'Sports & Outdoors',
  'Automotive',
  'Industrial & Manufacturing',
  'Food & Beverage',
  'Pet Supplies',
  'Office Supplies',
  'Other',
];

const currencies = ['USD', 'EUR', 'GBP', 'SGD', 'AUD', 'CAD', 'CNY'];

const timelines = [
  'As soon as possible',
  'Within 1 month',
  'Within 3 months',
  'Within 6 months',
  'Flexible',
];

export default function SourcingRequestForm() {
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<SourcingFormData>({
    productName: '',
    productDescription: '',
    category: '',
    specifications: '',
    quantity: '',
    targetPrice: '',
    currency: 'USD',
    timeline: '',
    deliveryAddress: '',
    country: '',
    additionalNotes: '',
    files: [],
  });

  const updateFormData = (field: keyof SourcingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const markFieldTouched = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };

  const getFieldError = (field: keyof SourcingFormData): string | null => {
    if (!touchedFields.has(field)) return null;
    
    const value = formData[field];
    
    switch (field) {
      case 'productName':
        if (!value || (typeof value === 'string' && value.trim().length === 0)) return 'Product name is required';
        if (typeof value === 'string' && value.length < 3) return 'Product name must be at least 3 characters';
        break;
      case 'productDescription':
        if (!value || (typeof value === 'string' && value.trim().length === 0)) return 'Description is required';
        if (typeof value === 'string' && value.length < 20) return 'Description must be at least 20 characters';
        break;
      case 'category':
        if (!value || value === '') return 'Please select a category';
        break;
      case 'quantity':
        if (!value || (typeof value === 'string' && value.trim().length === 0)) return 'Quantity is required';
        if (typeof value === 'string' && isNaN(Number(value))) return 'Quantity must be a number';
        if (typeof value === 'string' && Number(value) <= 0) return 'Quantity must be greater than 0';
        break;
      case 'targetPrice':
        if (!value || (typeof value === 'string' && value.trim().length === 0)) return 'Target price is required';
        if (typeof value === 'string' && isNaN(Number(value))) return 'Price must be a number';
        if (typeof value === 'string' && Number(value) <= 0) return 'Price must be greater than 0';
        break;
      case 'timeline':
        if (!value || value === '') return 'Please select a timeline';
        break;
      case 'country':
        if (!value || (typeof value === 'string' && value.trim().length === 0)) return 'Country is required';
        break;
    }
    
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as FormStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as FormStep);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/sourcing-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.productName && formData.category && formData.productDescription;
      case 2:
        return formData.quantity && formData.targetPrice;
      case 3:
        return formData.timeline && formData.country;
      case 4:
        return true;
      default:
        return false;
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Request Submitted!</h2>
        <p className="text-lg text-gray-600 mb-8">
          Thank you for your sourcing request. Our team will review it and get back to you within 24-48 hours with quotes and options.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
          <ul className="text-left text-sm text-gray-700 space-y-2">
            <li>✓ Our sourcing team reviews your request</li>
            <li>✓ We search our supplier network for the best matches</li>
            <li>✓ You receive quotes and product options via email</li>
            <li>✓ Once approved, we create a pool and notify interested buyers</li>
          </ul>
        </div>
        <button
          onClick={() => {
            setIsSubmitted(false);
            setCurrentStep(1);
            setFormData({
              productName: '',
              productDescription: '',
              category: '',
              specifications: '',
              quantity: '',
              targetPrice: '',
              currency: 'USD',
              timeline: '',
              deliveryAddress: '',
              country: '',
              additionalNotes: '',
              files: [],
            });
          }}
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step === currentStep
                    ? 'bg-orange-500 text-white scale-110'
                    : step < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step < currentStep ? <CheckCircle2 className="w-5 h-5" /> : step}
              </div>
              {step < 4 && (
                <div
                  className={`h-1 w-16 sm:w-24 md:w-32 mx-2 transition-all ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs sm:text-sm font-medium text-gray-600">
          <span>Product Details</span>
          <span>Quantity & Price</span>
          <span>Timeline</span>
          <span>Review</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 sm:p-8">
        {/* Step 1: Product Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-6 h-6 text-orange-500" />
              <h3 className="text-xl font-bold text-gray-900">Product Details</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => updateFormData('productName', e.target.value)}
                onBlur={() => markFieldTouched('productName')}
                placeholder="e.g., Custom Wireless Earbuds"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  getFieldError('productName') ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {getFieldError('productName') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('productName')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => updateFormData('category', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                aria-label="Product category"
                title="Select product category"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.productDescription}
                onChange={(e) => updateFormData('productDescription', e.target.value)}
                placeholder="Describe what you're looking for in detail..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Technical Specifications (Optional)
              </label>
              <textarea
                value={formData.specifications}
                onChange={(e) => updateFormData('specifications', e.target.value)}
                placeholder="Size, material, color, features, certifications, etc."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Files (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Upload images, specs, or reference files
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block bg-gray-100 text-gray-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  Choose Files
                </label>
              </div>
              {formData.files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg"
                    >
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Quantity & Pricing */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-6 h-6 text-orange-500" />
              <h3 className="text-xl font-bold text-gray-900">Quantity & Pricing</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desired Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => updateFormData('quantity', e.target.value)}
                placeholder="e.g., 1000"
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the minimum quantity you need
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Price Per Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.targetPrice}
                  onChange={(e) => updateFormData('targetPrice', e.target.value)}
                  placeholder="e.g., 15.00"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => updateFormData('currency', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  aria-label="Select currency"
                  title="Select currency"
                >
                  {currencies.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Tip:</strong> Setting a realistic target price helps us find the best
                suppliers. We'll work to get you the best possible price.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Estimated Total</h4>
              <p className="text-3xl font-bold text-orange-600">
                {formData.quantity && formData.targetPrice
                  ? `${formData.currency} ${(
                      parseFloat(formData.quantity) * parseFloat(formData.targetPrice)
                    ).toLocaleString()}`
                  : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This is an estimate. Final pricing depends on supplier quotes.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Timeline & Delivery */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-orange-500" />
              <h3 className="text-xl font-bold text-gray-900">Timeline & Delivery</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                When do you need this? <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.timeline}
                onChange={(e) => updateFormData('timeline', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                aria-label="Select timeline"
                title="When do you need this?"
              >
                <option value="">Select timeline</option>
                {timelines.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => updateFormData('country', e.target.value)}
                placeholder="e.g., United States"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address (Optional)
              </label>
              <textarea
                value={formData.deliveryAddress}
                onChange={(e) => updateFormData('deliveryAddress', e.target.value)}
                placeholder="Street address, city, state, postal code"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can provide this later. We'll use it to calculate shipping costs.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review & Additional Info */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-orange-500" />
              <h3 className="text-xl font-bold text-gray-900">Review & Submit</h3>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-1">Product</h4>
                <p className="text-gray-900">{formData.productName}</p>
                <p className="text-sm text-gray-600">{formData.category}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-1">Quantity & Price</h4>
                <p className="text-gray-900">
                  {formData.quantity} units @ {formData.currency} {formData.targetPrice} each
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-1">Timeline</h4>
                <p className="text-gray-900">{formData.timeline}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-1">Delivery</h4>
                <p className="text-gray-900">{formData.country}</p>
              </div>
              {formData.files.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">Attached Files</h4>
                  <p className="text-gray-900">{formData.files.length} file(s)</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => updateFormData('additionalNotes', e.target.value)}
                placeholder="Any other information that would help us source the perfect product for you..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-900">
                <strong>📧 Important:</strong> We'll send quotes and updates to your registered
                email. Make sure to check your inbox and spam folder.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!isStepValid()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Submit Request
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
