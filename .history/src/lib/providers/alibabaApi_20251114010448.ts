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
    const appKey = config?.appKey || process.env.ALIBABA_APP_KEY;
    const appSecret = config?.appSecret || process.env.ALIBABA_APP_SECRET;
    
    this.config = {
      appKey: appKey || '',
      appSecret: appSecret || '',
      accessToken: config?.accessToken || process.env.ALIBABA_ACCESS_TOKEN || '',
      // Use ICBU (Alibaba.com international) API gateway
      baseUrl: config?.baseUrl || 'https://gw.api.alibaba.com/openapi',
      apiGateway: config?.apiGateway || 'https://eco.taobao.com/router/rest',
    };

    if (!appKey || !appSecret) {
      console.warn('[AlibabaAPI] Missing credentials. Set ALIBABA_APP_KEY and ALIBABA_APP_SECRET');
      console.warn('[AlibabaAPI] Current values:', { 
        appKey: appKey ? `${appKey.substring(0, 6)}...` : 'undefined',
        appSecret: appSecret ? 'SET' : 'undefined'
      });
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
   * Exchange authorization code for access token (OAuth2 flow)
   * This is used after a seller authorizes your app
   * Endpoint: /auth/token/create
   */
  async exchangeCodeForToken(authorizationCode: string): Promise<TokenResponse | null> {
    const { appKey, appSecret } = this.config;
    
    try {
      const params = {
        grant_type: 'authorization_code',
        client_id: appKey,
        client_secret: appSecret,
        code: authorizationCode,
        redirect_uri: process.env.ALIBABA_REDIRECT_URI || '',
      };

      if (!params.redirect_uri) {
        throw new Error('ALIBABA_REDIRECT_URI environment variable is required for OAuth. Use ngrok for local development.');
      }

      const response = await this.request('/auth/token/create', params, false);
      
      if (response?.access_token) {
        this.tokenCache = {
          token: response.access_token,
          expiresAt: Date.now() + (response.expires_in * 1000) - 60000,
        };
      }

      return response as TokenResponse;
    } catch (error) {
      console.error('[AlibabaAPI] Code exchange failed:', error);
      return null;
    }
  }

  /**
   * Generate authorization URL for OAuth2 flow
   * Redirect sellers to this URL to authorize your app
   */
  generateAuthorizationUrl(state?: string): string {
    const { appKey } = this.config;
    const redirectUri = process.env.ALIBABA_REDIRECT_URI;

    if (!redirectUri) {
      throw new Error('ALIBABA_REDIRECT_URI environment variable is required. For local development, use ngrok: https://ngrok.com/');
    }
    
    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri: redirectUri,
      client_id: appKey,
      state: state || Math.random().toString(36).substring(7),
    });

    // ICBU (Alibaba.com International) OAuth endpoint
    // According to official docs: https://openapi-auth.alibaba.com/oauth/authorize
    const authEndpoint = 'https://openapi-auth.alibaba.com/oauth/authorize';
    
    return `${authEndpoint}?${params.toString()}`;
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

    console.log('[AlibabaAPI] API Request URL:', url.toString().replace(/access_token=[^&]+/, 'access_token=***'));

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AlibabaAPI] API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      
      // Check for API error response
      if (data.error_response) {
        console.error('[AlibabaAPI] API Error:', data.error_response);
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
   * Get Product Information V2 (Recommended)
   * Endpoint: /alibaba/icbu/product/get/v2
   * Returns comprehensive product details including MOQ, pricing, images, attributes
   */
  async getProductInfoV2(productId: string | number): Promise<ProductInfoV2 | null> {
    try {
      const response = await this.request('/alibaba/icbu/product/get/v2', {
        product_id: String(productId),
      });

      if (response?.result) {
        return response.result as ProductInfoV2;
      }

      return null;
    } catch (error) {
      console.error('[AlibabaAPI] Failed to fetch product V2:', error);
      return null;
    }
  }

  /**
   * Query Product List V2
   * Endpoint: /alibaba/icbu/product/search/v2
   * Search for products with filters
   */
  async searchProductsV2(params: {
    keyword?: string;
    categoryId?: string;
    page?: number;
    pageSize?: number;
    minPrice?: number;
    maxPrice?: number;
    minMoq?: number;
    status?: string; // 'published' | 'pending' | 'rejected'
  }): Promise<ProductSearchResultV2 | null> {
    try {
      const requestParams: Record<string, any> = {
        page_no: params.page || 1,
        page_size: params.pageSize || 20,
      };

      if (params.keyword) requestParams.keyword = params.keyword;
      if (params.categoryId) requestParams.category_id = params.categoryId;
      if (params.minPrice) requestParams.min_price = params.minPrice;
      if (params.maxPrice) requestParams.max_price = params.maxPrice;
      if (params.minMoq) requestParams.min_moq = params.minMoq;
      if (params.status) requestParams.status = params.status;

      const response = await this.request('/alibaba/icbu/product/search/v2', requestParams);

      if (response?.result) {
        return {
          products: response.result.products || [],
          totalCount: response.result.total_count || 0,
          currentPage: response.result.current_page || 1,
          pageSize: response.result.page_size || 20,
        };
      }

      return null;
    } catch (error) {
      console.error('[AlibabaAPI] Product search V2 failed:', error);
      return null;
    }
  }

  /**
   * Get Category Information V2
   * Endpoint: /alibaba/icbu/category/get/v2
   */
  async getCategoryInfoV2(categoryId: string): Promise<CategoryInfoV2 | null> {
    try {
      const response = await this.request('/alibaba/icbu/category/get/v2', {
        category_id: categoryId,
      });

      if (response?.result) {
        return response.result as CategoryInfoV2;
      }

      return null;
    } catch (error) {
      console.error('[AlibabaAPI] Category info V2 failed:', error);
      return null;
    }
  }

  /**
   * Get Product Inventory
   * Endpoint: /icbu/product/inventory/get
   */
  async getProductInventory(productId: string | number): Promise<ProductInventory | null> {
    try {
      const response = await this.request('/icbu/product/inventory/get', {
        product_id: String(productId),
      });

      if (response?.result) {
        return response.result as ProductInventory;
      }

      return null;
    } catch (error) {
      console.error('[AlibabaAPI] Inventory fetch failed:', error);
      return null;
    }
  }

  /**
   * Calculate freight cost
   * Endpoint: /shipping/freight/calculate
   */
  async calculateFreight(params: {
    productId: string | number;
    quantity: number;
    country?: string;
    province?: string;
    city?: string;
  }): Promise<FreightCalculation | null> {
    try {
      const requestParams = {
        product_id: String(params.productId),
        quantity: params.quantity,
        country: params.country || 'US',
        province: params.province || '',
        city: params.city || '',
      };

      const response = await this.request('/shipping/freight/calculate', requestParams);

      if (response?.result) {
        return response.result as FreightCalculation;
      }

      return null;
    } catch (error) {
      console.error('[AlibabaAPI] Freight calculation failed:', error);
      return null;
    }
  }

  /**
   * Query shipping templates
   * Endpoint: /alibaba/icbu/product/list/shipping/template
   */
  async getShippingTemplates(): Promise<ShippingTemplate[]> {
    try {
      const response = await this.request('/alibaba/icbu/product/list/shipping/te', {});

      if (response?.result?.templates) {
        return response.result.templates as ShippingTemplate[];
      }

      return [];
    } catch (error) {
      console.error('[AlibabaAPI] Shipping templates fetch failed:', error);
      return [];
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

  /**
   * Convert Product V2 API data to display format
   * This is the primary method for displaying Alibaba listings
   */
  toProductDetailV2(apiData: ProductInfoV2): any {
    // Format price tiers
    const priceTiers = (apiData.priceRanges || []).map(range => {
      const rangeText = range.endQuantity
        ? `${range.startQuantity}-${range.endQuantity}`
        : `≥ ${range.startQuantity}`;
      return {
        price: `US$${range.price}`,
        range: rangeText,
        min: range.startQuantity,
        max: range.endQuantity,
      };
    }).sort((a, b) => a.min - b.min);

    // Format attributes
    const attributes = (apiData.attributes || []).map(attr => ({
      label: attr.attributeName,
      value: attr.valueName || '',
      id: attr.attributeId,
    }));

    // Format images
    const images = apiData.imageList || (apiData.mainImage ? [apiData.mainImage] : []);

    return {
      productId: apiData.productId,
      title: apiData.subject,
      price: apiData.price ? `US$${apiData.price}` : null,
      priceText: priceTiers[0]?.price || (apiData.price ? `US$${apiData.price}` : null),
      priceTiers,
      moq: apiData.moq || 1,
      moqText: apiData.moq ? `${apiData.moq} ${apiData.unit || 'pieces'}` : null,
      unit: apiData.unit || 'pieces',
      attributes,
      heroImage: images[0] || null,
      gallery: images,
      description: apiData.description || null,
      categoryId: apiData.categoryId,
      categoryName: apiData.categoryName,
      supplier: {
        memberId: apiData.supplierMemberId,
        userId: apiData.supplierUserId,
        loginId: apiData.supplierLoginId,
      },
      status: apiData.status,
      createdAt: apiData.gmtCreate,
      updatedAt: apiData.gmtModified,
    };
  }

  /**
   * Fetch complete product data with inventory and shipping
   * This method combines multiple API calls for comprehensive product info
   */
  async getCompleteProductInfo(productIdOrUrl: string): Promise<any | null> {
    try {
      // Extract product ID
      const productId = productIdOrUrl.includes('http')
        ? this.extractProductId(productIdOrUrl)
        : productIdOrUrl;

      if (!productId) {
        console.error('[AlibabaAPI] Could not extract product ID from:', productIdOrUrl);
        return null;
      }

      console.log(`[AlibabaAPI] Fetching complete info for product ${productId}...`);

      // Fetch product info (primary data)
      const productInfo = await this.getProductInfoV2(productId);
      if (!productInfo) {
        console.warn(`[AlibabaAPI] Product ${productId} not found`);
        return null;
      }

      // Convert to display format
      const productDetail = this.toProductDetailV2(productInfo);

      // Fetch additional data in parallel
      const [inventory, shippingTemplates] = await Promise.all([
        this.getProductInventory(productId).catch(() => null),
        this.getShippingTemplates().catch(() => []),
      ]);

      // Add inventory info
      if (inventory) {
        productDetail.inventory = {
          total: inventory.totalQuantity,
          available: inventory.availableQuantity,
          reserved: inventory.reservedQuantity,
          skus: inventory.skus,
        };
      }

      // Add shipping info
      if (shippingTemplates.length > 0) {
        productDetail.shipping = {
          templates: shippingTemplates,
          defaultTemplate: shippingTemplates[0],
        };
      }

      console.log(`[AlibabaAPI] ✓ Successfully fetched product ${productId}`);
      return productDetail;
    } catch (error) {
      console.error('[AlibabaAPI] Failed to fetch complete product info:', error);
      return null;
    }
  }
}

// Singleton instance (lazy-initialized to support late env variable loading)
let _alibabaApiInstance: AlibabaApiClient | null = null;
export const alibabaApi = new Proxy({} as AlibabaApiClient, {
  get(target, prop) {
    if (!_alibabaApiInstance) {
      _alibabaApiInstance = new AlibabaApiClient();
    }
    return (_alibabaApiInstance as any)[prop];
  }
});

/**
 * Helper function to fetch product using API (with fallback to scraping)
 * THIS IS THE MAIN ENTRY POINT - Use this in your providers
 */
export async function fetchProductViaApi(url: string): Promise<any | null> {
  try {
    console.log('[AlibabaAPI] 🔄 Attempting to fetch via official API:', url);
    
    // Try V2 API first (comprehensive data)
    const apiData = await alibabaApi.getCompleteProductInfo(url);
    if (apiData) {
      console.log('[AlibabaAPI] ✓ Successfully fetched via official API');
      return apiData;
    }

    console.log('[AlibabaAPI] ⚠️ API returned no data');
  } catch (error) {
    console.warn('[AlibabaAPI] API fetch failed:', error instanceof Error ? error.message : error);
  }
  
  console.log('[AlibabaAPI] ℹ️ Will fallback to scraping (if available)');
  return null;
}

/**
 * Search products using API
 * Use this to replace scraping-based product discovery
 */
export async function searchAlibabaProducts(params: {
  keyword?: string;
  category?: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  minMoq?: number;
}): Promise<any[]> {
  try {
    console.log('[AlibabaAPI] 🔍 Searching products:', params);

    const result = await alibabaApi.searchProductsV2({
      keyword: params.keyword,
      categoryId: params.category,
      page: params.page || 1,
      pageSize: params.limit || 20,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      minMoq: params.minMoq,
      status: 'published', // Only show published products
    });

    if (!result || !result.products) {
      return [];
    }

    // Convert all products to display format
    const products = result.products.map(p => alibabaApi.toProductDetailV2(p));
    
    console.log(`[AlibabaAPI] ✓ Found ${products.length} products`);
    return products;
  } catch (error) {
    console.error('[AlibabaAPI] Product search failed:', error);
    return [];
  }
}
