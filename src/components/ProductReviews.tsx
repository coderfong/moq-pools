"use client";

import { useState } from 'react';
import { Star, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  helpful: number;
  verified: boolean;
  createdAt: Date;
}

interface ProductReviewsProps {
  productId: string;
  reviews?: Review[];
  canReview?: boolean;
  className?: string;
}

export default function ProductReviews({
  productId,
  reviews = [],
  canReview = false,
  className = '',
}: ProductReviewsProps) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage: reviews.length > 0
      ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100
      : 0,
  }));

  const handleSubmitReview = async () => {
    if (selectedRating === 0 || !reviewComment.trim()) {
      return;
    }

    try {
      // API call to submit review
      if (process.env.NODE_ENV !== 'production') {
        console.log('Submitting review:', {
          productId,
          rating: selectedRating,
          title: reviewTitle,
          comment: reviewComment,
        });
      }

      // Reset form
      setSelectedRating(0);
      setReviewTitle('');
      setReviewComment('');
      setShowReviewForm(false);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to submit review:', error);
      }
    }
  };

  const handleHelpful = (reviewId: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Mark review as helpful:', reviewId);
    }
    // API call to mark review as helpful
  };

  return (
    <div className={`${className}`}>
      {/* Rating summary */}
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">Customer Reviews</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {/* Average rating */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-1 sm:gap-2 mb-1 sm:mb-2">
              <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                {averageRating.toFixed(1)}
              </span>
              <div>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${
                        i < Math.round(averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>
          </div>

          {/* Rating distribution */}
          <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
            {ratingDistribution.map(({ star, count, percentage }) => (
              <div key={star} className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <span className="text-xs sm:text-sm text-gray-700 w-8 sm:w-10 md:w-12">{star} star</span>
                <div className="flex-1 h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400"
                    style={{ width: `${percentage}%` }} // Dynamic rating distribution
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-8">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Write review button */}
        {canReview && !showReviewForm && (
          <div className="mt-6">
            <Button
              onClick={() => setShowReviewForm(true)}
              className="w-full md:w-auto bg-orange-600 hover:bg-orange-700"
            >
              Write a Review
            </Button>
          </div>
        )}
      </div>

      {/* Review form */}
      {showReviewForm && (
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6">
          <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 md:mb-4">Write Your Review</h4>
          
          {/* Rating selector */}
          <div className="mb-2 sm:mb-3 md:mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Your Rating *
            </label>
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedRating(i + 1)}
                  className="hover:scale-110 transition-transform"
                  aria-label={`Rate ${i + 1} star${i === 0 ? '' : 's'}`}
                  title={`Rate ${i + 1} star${i === 0 ? '' : 's'}`}
                >
                  <Star
                    className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 ${
                      i < selectedRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review title */}
          <div className="mb-2 sm:mb-3 md:mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Review Title
            </label>
            <input
              type="text"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Sum up your experience"
              className="w-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Review comment */}
          <div className="mb-2 sm:mb-3 md:mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Your Review *
            </label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience with this product"
              rows={4}
              className="w-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmitReview}
              disabled={selectedRating === 0 || !reviewComment.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Submit Review
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowReviewForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      <div className="space-y-2 sm:space-y-3 md:space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6"
          >
            <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
              {/* User avatar */}
              <div className="flex-shrink-0">
                {review.userAvatar ? (
                  <Image
                    src={review.userAvatar}
                    alt={review.userName}
                    width={32}
                    height={32}
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-semibold text-sm sm:text-base md:text-lg">
                      {review.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* User info and rating */}
                <div className="flex items-start justify-between mb-1 sm:mb-2">
                  <div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <h5 className="font-semibold text-xs sm:text-sm md:text-base text-gray-900">{review.userName}</h5>
                      {review.verified && (
                        <span className="text-[10px] sm:text-xs bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review title */}
                {review.title && (
                  <h6 className="font-semibold text-xs sm:text-sm md:text-base text-gray-900 mb-1 sm:mb-2">{review.title}</h6>
                )}

                {/* Review comment */}
                <p className="text-xs sm:text-sm md:text-base text-gray-700 mb-2 sm:mb-3 md:mb-4">{review.comment}</p>

                {/* Review images */}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-1 sm:gap-2 mb-2 sm:mb-3 md:mb-4">
                    {review.images.map((image, index) => (
                      <div
                        key={index}
                        className="relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded sm:rounded-lg overflow-hidden">
                      >
                        <Image
                          src={image}
                          alt={`Review image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Helpful button */}
                <button
                  onClick={() => handleHelpful(review.id)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Helpful ({review.helpful})</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No reviews yet. Be the first to review!</p>
          </div>
        )}
      </div>
    </div>
  );
}
