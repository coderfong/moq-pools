/**
 * Analytics tracking utilities for MOQ Pools
 * Supports multiple analytics providers (Google Analytics, Mixpanel, etc.)
 */

// Event types
export type AnalyticsEvent =
  // Pool events
  | 'pool_viewed'
  | 'pool_joined'
  | 'pool_shared'
  | 'pool_completed'
  // Product events
  | 'product_viewed'
  | 'product_searched'
  | 'product_filtered'
  | 'product_added_to_wishlist'
  | 'product_removed_from_wishlist'
  // Cart & Checkout events
  | 'cart_viewed'
  | 'item_added_to_cart'
  | 'item_removed_from_cart'
  | 'checkout_started'
  | 'payment_info_entered'
  | 'order_completed'
  // User events
  | 'user_signed_up'
  | 'user_logged_in'
  | 'user_logged_out'
  | 'profile_updated'
  // Review events
  | 'review_submitted'
  | 'review_helpful_voted'
  // Social events
  | 'content_shared';

interface AnalyticsEventData {
  [key: string]: string | number | boolean | undefined;
}

class Analytics {
  private enabled: boolean;

  constructor() {
    this.enabled = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';
  }

  /**
   * Track a custom event
   */
  track(eventName: AnalyticsEvent, properties?: AnalyticsEventData) {
    if (!this.enabled) {
      console.log('[Analytics Debug]', eventName, properties);
      return;
    }

    try {
      // Google Analytics 4
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', eventName, properties);
      }

      // Mixpanel
      if (typeof window !== 'undefined' && (window as any).mixpanel) {
        (window as any).mixpanel.track(eventName, properties);
      }

      // Custom analytics API
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: eventName,
            properties: {
              ...properties,
              timestamp: new Date().toISOString(),
              url: window.location.href,
              referrer: document.referrer,
            },
          }),
        }).catch((error) => console.error('Analytics API error:', error));
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  /**
   * Track page view
   */
  pageView(page?: string) {
    if (!this.enabled) return;

    try {
      const currentPage = page || window.location.pathname;

      // Google Analytics 4
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
          page_path: currentPage,
        });
      }

      // Mixpanel
      if (typeof window !== 'undefined' && (window as any).mixpanel) {
        (window as any).mixpanel.track_pageview();
      }
    } catch (error) {
      console.error('Page view tracking error:', error);
    }
  }

  /**
   * Identify user for analytics
   */
  identify(userId: string, traits?: AnalyticsEventData) {
    if (!this.enabled) return;

    try {
      // Google Analytics 4
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('set', 'user_id', userId);
        if (traits) {
          (window as any).gtag('set', 'user_properties', traits);
        }
      }

      // Mixpanel
      if (typeof window !== 'undefined' && (window as any).mixpanel) {
        (window as any).mixpanel.identify(userId);
        if (traits) {
          (window as any).mixpanel.people.set(traits);
        }
      }
    } catch (error) {
      console.error('User identification error:', error);
    }
  }

  /**
   * Reset analytics on logout
   */
  reset() {
    if (!this.enabled) return;

    try {
      // Mixpanel
      if (typeof window !== 'undefined' && (window as any).mixpanel) {
        (window as any).mixpanel.reset();
      }
    } catch (error) {
      console.error('Analytics reset error:', error);
    }
  }

  /**
   * Track ecommerce events
   */
  trackEcommerce(action: 'view_item' | 'add_to_cart' | 'remove_from_cart' | 'begin_checkout' | 'purchase', data: {
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      category?: string;
    }>;
    value?: number;
    currency?: string;
    transaction_id?: string;
  }) {
    if (!this.enabled) return;

    try {
      // Google Analytics 4 Enhanced Ecommerce
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', action, {
          currency: data.currency || 'USD',
          value: data.value,
          items: data.items.map((item) => ({
            item_id: item.id,
            item_name: item.name,
            price: item.price,
            quantity: item.quantity,
            item_category: item.category,
          })),
          transaction_id: data.transaction_id,
        });
      }
    } catch (error) {
      console.error('Ecommerce tracking error:', error);
    }
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Convenience functions
export function trackPoolView(poolId: string, poolName: string) {
  analytics.track('pool_viewed', {
    pool_id: poolId,
    pool_name: poolName,
  });
}

export function trackPoolJoin(poolId: string, poolName: string, quantity: number) {
  analytics.track('pool_joined', {
    pool_id: poolId,
    pool_name: poolName,
    quantity,
  });
}

export function trackProductView(productId: string, productName: string, price: number) {
  analytics.track('product_viewed', {
    product_id: productId,
    product_name: productName,
    price,
  });

  analytics.trackEcommerce('view_item', {
    items: [{
      id: productId,
      name: productName,
      price,
      quantity: 1,
    }],
    value: price,
  });
}

export function trackSearch(query: string, results: number) {
  analytics.track('product_searched', {
    search_query: query,
    results_count: results,
  });
}

export function trackAddToCart(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) {
  analytics.track('item_added_to_cart', {
    product_id: item.id,
    product_name: item.name,
    price: item.price,
    quantity: item.quantity,
  });

  analytics.trackEcommerce('add_to_cart', {
    items: [item],
    value: item.price * item.quantity,
  });
}

export function trackCheckoutStarted(value: number, items: number) {
  analytics.track('checkout_started', {
    cart_value: value,
    items_count: items,
  });

  analytics.trackEcommerce('begin_checkout', {
    items: [],
    value,
  });
}

export function trackPurchase(orderId: string, value: number, items: Array<{
  id: string;
  name: string;
  price: number;
  quantity: number;
}>) {
  analytics.track('order_completed', {
    order_id: orderId,
    order_value: value,
  });

  analytics.trackEcommerce('purchase', {
    transaction_id: orderId,
    value,
    items,
  });
}

export function trackUserSignup(userId: string, method: string) {
  analytics.identify(userId);
  analytics.track('user_signed_up', {
    signup_method: method,
  });
}

export function trackUserLogin(userId: string) {
  analytics.identify(userId);
  analytics.track('user_logged_in', {});
}

export function trackShare(contentType: string, contentId: string, platform: string) {
  analytics.track('content_shared', {
    content_type: contentType,
    content_id: contentId,
    share_platform: platform,
  });
}
