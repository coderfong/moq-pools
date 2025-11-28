/**
 * Alibaba Open Platform API Client
 * 
 * This module provides methods to fetch product data from Alibaba's official API
 * instead of web scraping, which bypasses anti-bot protection.
 * 
 * Setup:
 * 1. Register at https://open.1688.com/ or https://open.alibaba.com/
 * 2. Create an application to get App Key and App Secret
 * 3. Set environment variables:
 *    - ALIBABA_APP_KEY=your_app_key
 *    - ALIBABA_APP_SECRET=your_app_secret
 *    - ALIBABA_ACCESS_TOKEN=your_access_token (optional, will auto-refresh)
 */

import crypto from 'crypto';

interface AlibabaApiConfig {
  appKey: string;
  appSecret: string;
  accessToken?: string;
  baseUrl?: string;
  apiGateway?: string;
}

// Auth API Types
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  resource_owner: string;
  refresh_token_timeout?: number;
}

// Product V2 API Types
interface ProductInfoV2 {
  productId: string;
  subject: string;
  mainImage?: string;
  imageList?: string[];
  price?: number;
  priceRanges?: Array<{
    price: number;
    startQuantity: number;
    endQuantity?: number;
  }>;
  moq?: number; // Minimum order quantity
  unit?: string;
  categoryId?: string;
  categoryName?: string;
  attributes?: Array<{
    attributeId: string;
    attributeName: string;
    valueId?: string;
    valueName?: string;
  }>;
  description?: string;
  supplierLoginId?: string;
  supplierMemberId?: string;
  supplierUserId?: string;
  status?: string;
  gmtCreate?: string;
  gmtModified?: string;
}

interface ProductSearchResultV2 {
  products: ProductInfoV2[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

interface CategoryInfoV2 {
  categoryId: string;
  categoryName: string;
  parentId?: string;
  isLeaf?: boolean;
  level?: number;
  childCategories?: CategoryInfoV2[];
}

// Shipping/Freight Types
interface FreightCalculation {
  freight?: number;
  currency?: string;
  deliveryTime?: string;
  shippingMethod?: string;
}

interface ShippingTemplate {
  templateId: string;
  templateName: string;
  freight?: number;
  freeShippingAmount?: number;
}

// Inventory Types
interface ProductInventory {
  productId: string;
  totalQuantity?: number;
  availableQuantity?: number;
  reservedQuantity?: number;
  skus?: Array<{
    skuId: string;
    quantity: number;
    price?: number;
  }>;
}

// Legacy interface for backward compatibility
interface AlibabaProductDetail {
  productId: string;
  subject: string;
  priceRanges?: Array<{
    price: number;
    startQuantity: number;
  }>;
  imageUrls?: string[];
  attributes?: Array<{
    attributeName: string;
    attributeValue: string;
  }>;
  moq?: number;
  supplierInfo?: {
    companyName?: string;
    memberId?: string;
  };
}

export class AlibabaApiClient {
  private config: AlibabaApiConfig;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(config?: Partial<AlibabaApiConfig>) {
    this.config = {
      appKey: config?.appKey || process.env.ALIBABA_APP_KEY || '',
      appSecret: config?.appSecret || process.env.ALIBABA_APP_SECRET || '',
      accessToken: config?.accessToken || process.env.ALIBABA_ACCESS_TOKEN || '',
      baseUrl: config?.baseUrl || 'https://gw.open.1688.com/openapi',
      apiGateway: config?.apiGateway || 'https://eco.taobao.com/router/rest',
    };

    if (!this.config.appKey || !this.config.appSecret) {
      console.warn('[AlibabaAPI] Missing credentials. Set ALIBABA_APP_KEY and ALIBABA_APP_SECRET');
    }
  }

  /**
   * Get valid access token (from cache or generate new one)
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    // Return config token if provided
    if (this.config.accessToken) {
      return this.config.accessToken;
    }

    // Generate new token
    try {
      const tokenData = await this.generateAccessToken();
      if (tokenData?.access_token) {
        this.tokenCache = {
          token: tokenData.access_token,
          expiresAt: Date.now() + (tokenData.expires_in * 1000) - 60000, // 1 min buffer
        };
        return tokenData.access_token;
      }
    } catch (error) {
      console.error('[AlibabaAPI] Failed to generate access token:', error);
    }

    throw new Error('No valid access token available');
  }

  /**
   * Generate OAuth2 access token
   * Endpoint: /auth/token/create
   */
  async generateAccessToken(): Promise<TokenResponse | null> {
    const { appKey, appSecret } = this.config;
    
    try {
      const params = {
        grant_type: 'client_credentials',
        client_id: appKey,
        client_secret: appSecret,
      };

      const response = await this.request('/auth/token/create', params, false);
      return response as TokenResponse;
    } catch (error) {
      console.error('[AlibabaAPI] Token generation failed:', error);
      return null;
    }
  }

  /**
   * Refresh access token
   * Endpoint: /auth/token/refresh
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
    const { appKey, appSecret } = this.config;
    
    try {
      const params = {
        grant_type: 'refresh_token',
        client_id: appKey,
        client_secret: appSecret,
        refresh_token: refreshToken,
      };

      const response = await this.request('/auth/token/refresh', params, false);
      
      if (response?.access_token) {
        this.tokenCache = {
          token: response.access_token,
          expiresAt: Date.now() + (response.expires_in * 1000) - 60000,
        };
      }

      return response as TokenResponse;
    } catch (error) {
      console.error('[AlibabaAPI] Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Extract product ID from Alibaba URL
   * Examples:
   * - https://www.alibaba.com/product-detail/..._1600450628256.html -> 1600450628256
   * - https://detail.1688.com/offer/123456.html -> 123456
   */
  private extractProductId(url: string): string | null {
    // Alibaba.com format
    const alibabaMatch = url.match(/[_/](\d{10,})\.html/);
    if (alibabaMatch) return alibabaMatch[1];

    // 1688.com format
    const format1688Match = url.match(/offer\/(\d+)\.html/);
    if (format1688Match) return format1688Match[1];

    return null;
  }

  /**
   * Generate API signature for authentication
   * Algorithm: MD5(app_secret + sorted_params + app_secret)
   */
  private generateSignature(params: Record<string, any>): string {
    const { appSecret } = this.config;
    
    // Sort parameters alphabetically
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys
      .map(key => `${key}${params[key]}`)
      .join('');
    
    // MD5(secret + params + secret)
    const signString = `${appSecret}${paramString}${appSecret}`;
    return crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
  }

  /**
   * Make authenticated API request
   */
  private async request(
    apiPath: string,
    params: Record<string, any> = {},
    requiresAuth: boolean = true
  ): Promise<any> {
    const { appKey, baseUrl } = this.config;

    if (!appKey) {
      throw new Error('Alibaba API credentials not configured');
    }

    // Add required authentication params
    const requestParams: Record<string, any> = {
      ...params,
      _aop_timestamp: Date.now().toString(),
    };

    // Add access token if required
    if (requiresAuth) {
      const token = await this.getAccessToken();
      requestParams.access_token = token;
    }

    // Generate signature
    requestParams._aop_signature = this.generateSignature(requestParams);

    // Build URL
    const url = new URL(`${baseUrl}${apiPath}/${appKey}`);
    Object.entries(requestParams).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check for API error response
      if (data.error_response) {
        throw new Error(`API Error: ${data.error_response.msg || JSON.stringify(data.error_response)}`);
      }

      return data;
    } catch (error) {
      console.error('[AlibabaAPI] Request failed:', error);
      throw error;
    }
  }

  /**
   * Fetch product details by product ID or URL
   */
  async getProductDetail(productIdOrUrl: string): Promise<AlibabaProductDetail | null> {
    try {
      // Extract product ID if URL is provided
      const productId = productIdOrUrl.includes('http')
        ? this.extractProductId(productIdOrUrl)
        : productIdOrUrl;

      if (!productId) {
        console.error('[AlibabaAPI] Could not extract product ID from:', productIdOrUrl);
        return null;
      }

      // Call Alibaba API
      const response = await this.request('/param2/1/com.alibaba.product/alibaba.product.get', {
        productId,
      });

      // Parse response (adjust based on actual API response structure)
      if (response?.result) {
        return this.normalizeProductDetail(response.result);
      }

      return null;
    } catch (error) {
      console.error('[AlibabaAPI] Failed to fetch product:', error);
      return null;
    }
  }

  /**
   * Normalize API response to our internal format
   */
  private normalizeProductDetail(apiData: any): AlibabaProductDetail {
    return {
      productId: apiData.productId || apiData.offerId || '',
      subject: apiData.subject || apiData.title || '',
      priceRanges: apiData.priceRanges || apiData.skuPrices || [],
      imageUrls: apiData.imageUrls || apiData.images || [],
      attributes: apiData.attributes || [],
      moq: apiData.moq || apiData.minOrderQuantity || 1,
      supplierInfo: {
        companyName: apiData.supplierInfo?.companyName,
        memberId: apiData.supplierInfo?.memberId,
      },
    };
  }

  /**
   * Convert API data to our ProductDetail format
   */
  toProductDetail(apiData: AlibabaProductDetail): any {
    const priceTiers = (apiData.priceRanges || []).map(range => ({
      price: `US$${range.price}`,
      range: `≥ ${range.startQuantity}`,
    }));

    const attributes = (apiData.attributes || []).map(attr => ({
      label: attr.attributeName,
      value: attr.attributeValue,
    }));

    return {
      title: apiData.subject,
      priceText: priceTiers[0]?.price || null,
      priceTiers,
      moqText: apiData.moq ? `${apiData.moq} pieces` : null,
      attributes,
      heroImage: apiData.imageUrls?.[0] || null,
      gallery: apiData.imageUrls || [],
      supplier: {
        name: apiData.supplierInfo?.companyName || null,
        logo: null,
      },
    };
  }
}

// Singleton instance
export const alibabaApi = new AlibabaApiClient();

/**
 * Helper function to fetch product using API (with fallback to scraping)
 */
export async function fetchProductViaApi(url: string): Promise<any | null> {
  try {
    // Try API first
    const apiData = await alibabaApi.getProductDetail(url);
    if (apiData) {
      return alibabaApi.toProductDetail(apiData);
    }
  } catch (error) {
    console.warn('[AlibabaAPI] API fetch failed, will fallback to scraping:', error);
  }
  
  return null;
}
