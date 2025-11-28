
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  name: 'name',
  phone: 'phone',
  companyName: 'companyName',
  countryCode: 'countryCode',
  isIndividualBuyer: 'isIndividualBuyer',
  role: 'role',
  emailVerified: 'emailVerified',
  image: 'image',
  createdAt: 'createdAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.SupplierScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  contactName: 'contactName',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone'
};

exports.Prisma.AddressScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  line1: 'line1',
  line2: 'line2',
  city: 'city',
  state: 'state',
  postal: 'postal',
  country: 'country',
  phone: 'phone'
};

exports.Prisma.PoolScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  status: 'status',
  targetQty: 'targetQty',
  pledgedQty: 'pledgedQty',
  deadlineAt: 'deadlineAt',
  moqReachedAt: 'moqReachedAt',
  createdAt: 'createdAt',
  lastProgressMilestone: 'lastProgressMilestone'
};

exports.Prisma.PoolItemScalarFieldEnum = {
  id: 'id',
  poolId: 'poolId',
  userId: 'userId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  currency: 'currency',
  addressId: 'addressId',
  poolItemStatus: 'poolItemStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PoolItemStatusHistoryScalarFieldEnum = {
  id: 'id',
  poolItemId: 'poolItemId',
  fromStatus: 'fromStatus',
  toStatus: 'toStatus',
  notes: 'notes',
  automated: 'automated',
  triggeredById: 'triggeredById',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  poolItemId: 'poolItemId',
  method: 'method',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  reference: 'reference',
  proofUrl: 'proofUrl',
  paidAt: 'paidAt',
  createdAt: 'createdAt'
};

exports.Prisma.ShipmentScalarFieldEnum = {
  id: 'id',
  poolItemId: 'poolItemId',
  carrier: 'carrier',
  trackingNo: 'trackingNo',
  status: 'status',
  etaDate: 'etaDate',
  eventsJson: 'eventsJson',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  supplierId: 'supplierId',
  title: 'title',
  description: 'description',
  imagesJson: 'imagesJson',
  baseCurrency: 'baseCurrency',
  unitPrice: 'unitPrice',
  moqQty: 'moqQty',
  maxQtyPerUser: 'maxQtyPerUser',
  leadTimeDays: 'leadTimeDays',
  isActive: 'isActive',
  sourcePlatform: 'sourcePlatform',
  sourceUrl: 'sourceUrl',
  sourceNotes: 'sourceNotes',
  createdAt: 'createdAt'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  title: 'title',
  company: 'company',
  avatarUrl: 'avatarUrl',
  preview: 'preview',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
  poolId: 'poolId'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  sender: 'sender',
  senderUserId: 'senderUserId',
  text: 'text',
  createdAt: 'createdAt'
};

exports.Prisma.ConversationParticipantScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  userId: 'userId',
  role: 'role',
  lastReadAt: 'lastReadAt',
  createdAt: 'createdAt'
};

exports.Prisma.ExternalListingCacheScalarFieldEnum = {
  id: 'id',
  platform: 'platform',
  url: 'url',
  title: 'title',
  image: 'image',
  priceRaw: 'priceRaw',
  currency: 'currency',
  priceMin: 'priceMin',
  priceMax: 'priceMax',
  moqRaw: 'moqRaw',
  moq: 'moq',
  ordersRaw: 'ordersRaw',
  ratingRaw: 'ratingRaw',
  storeName: 'storeName',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ListingSearchScalarFieldEnum = {
  id: 'id',
  q: 'q',
  platform: 'platform',
  filtersJson: 'filtersJson',
  total: 'total',
  createdAt: 'createdAt'
};

exports.Prisma.ListingSearchItemScalarFieldEnum = {
  id: 'id',
  searchId: 'searchId',
  listingId: 'listingId',
  position: 'position'
};

exports.Prisma.SavedListingScalarFieldEnum = {
  id: 'id',
  platform: 'platform',
  url: 'url',
  title: 'title',
  image: 'image',
  priceRaw: 'priceRaw',
  priceMin: 'priceMin',
  priceMax: 'priceMax',
  currency: 'currency',
  moqRaw: 'moqRaw',
  moq: 'moq',
  storeName: 'storeName',
  description: 'description',
  categories: 'categories',
  terms: 'terms',
  ratingRaw: 'ratingRaw',
  ordersRaw: 'ordersRaw',
  detailJson: 'detailJson',
  detailUpdatedAt: 'detailUpdatedAt',
  lastScrapeStatus: 'lastScrapeStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExportCategoryScalarFieldEnum = {
  id: 'id',
  label: 'label',
  url: 'url',
  parentLabel: 'parentLabel',
  depth: 'depth',
  itemCount: 'itemCount',
  hash: 'hash',
  firstSeen: 'firstSeen',
  lastSeen: 'lastSeen'
};

exports.Prisma.AlertScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  body: 'body',
  link: 'link',
  status: 'status',
  poolId: 'poolId',
  productName: 'productName',
  triageStatus: 'triageStatus',
  adminNotes: 'adminNotes',
  assigneeId: 'assigneeId',
  priority: 'priority',
  resolvedAt: 'resolvedAt',
  archivedAt: 'archivedAt',
  updatedAt: 'updatedAt',
  timestamp: 'timestamp'
};

exports.Prisma.PushTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  token: 'token',
  platform: 'platform',
  userAgent: 'userAgent',
  createdAt: 'createdAt',
  lastSeenAt: 'lastSeenAt'
};

exports.Prisma.ProductViewScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  savedListingId: 'savedListingId',
  productTitle: 'productTitle',
  productImage: 'productImage',
  productUrl: 'productUrl',
  viewedAt: 'viewedAt'
};

exports.Prisma.WishlistScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  savedListingId: 'savedListingId',
  productId: 'productId',
  productTitle: 'productTitle',
  productImage: 'productImage',
  productUrl: 'productUrl',
  productPrice: 'productPrice',
  productMoq: 'productMoq',
  platform: 'platform',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.SourcingRequestScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  productName: 'productName',
  productDescription: 'productDescription',
  category: 'category',
  specifications: 'specifications',
  quantity: 'quantity',
  targetPrice: 'targetPrice',
  currency: 'currency',
  timeline: 'timeline',
  deliveryAddress: 'deliveryAddress',
  country: 'country',
  additionalNotes: 'additionalNotes',
  status: 'status',
  adminNotes: 'adminNotes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  productId: 'productId',
  poolId: 'poolId',
  rating: 'rating',
  title: 'title',
  comment: 'comment',
  images: 'images',
  helpful: 'helpful',
  verified: 'verified',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReviewHelpfulVoteScalarFieldEnum = {
  id: 'id',
  reviewId: 'reviewId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.Role = exports.$Enums.Role = {
  BUYER: 'BUYER',
  ADMIN: 'ADMIN',
  SUPPLIER: 'SUPPLIER'
};

exports.PoolStatus = exports.$Enums.PoolStatus = {
  OPEN: 'OPEN',
  LOCKED: 'LOCKED',
  ACTIVE: 'ACTIVE',
  ORDER_PLACED: 'ORDER_PLACED',
  FULFILLING: 'FULFILLING',
  FULFILLED: 'FULFILLED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

exports.ProgressMilestone = exports.$Enums.ProgressMilestone = {
  NONE: 'NONE',
  FIFTY: 'FIFTY',
  NINETY: 'NINETY',
  MOQ: 'MOQ'
};

exports.PoolItemStatus = exports.$Enums.PoolItemStatus = {
  JOINING: 'JOINING',
  POOL_ACTIVE: 'POOL_ACTIVE',
  MOQ_REACHED: 'MOQ_REACHED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  ORDER_PLACED: 'ORDER_PLACED',
  PREPARING_SHIPMENT: 'PREPARING_SHIPMENT',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED'
};

exports.PayMethod = exports.$Enums.PayMethod = {
  STRIPE: 'STRIPE',
  BANK_TRANSFER: 'BANK_TRANSFER'
};

exports.PayStatus = exports.$Enums.PayStatus = {
  PENDING: 'PENDING',
  REQUIRES_ACTION: 'REQUIRES_ACTION',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED: 'CAPTURED',
  PAID: 'PAID',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED'
};

exports.ShipStatus = exports.$Enums.ShipStatus = {
  LABEL_CREATED: 'LABEL_CREATED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  EXCEPTION: 'EXCEPTION'
};

exports.SourcePlatform = exports.$Enums.SourcePlatform = {
  C1688: 'C1688',
  ALIBABA: 'ALIBABA',
  TAOBAO: 'TAOBAO',
  MADE_IN_CHINA: 'MADE_IN_CHINA',
  INDIAMART: 'INDIAMART',
  SEA_LOCAL: 'SEA_LOCAL',
  ALIEXPRESS: 'ALIEXPRESS',
  GLOBAL_SOURCES: 'GLOBAL_SOURCES'
};

exports.ScrapeStatus = exports.$Enums.ScrapeStatus = {
  OK: 'OK',
  WEAK: 'WEAK'
};

exports.AlertType = exports.$Enums.AlertType = {
  GROUP_UPDATE: 'GROUP_UPDATE',
  SHIPPING: 'SHIPPING',
  PROMOTION: 'PROMOTION',
  SYSTEM: 'SYSTEM',
  PAYMENT: 'PAYMENT',
  ORDER: 'ORDER',
  ACCOUNT: 'ACCOUNT'
};

exports.AlertStatus = exports.$Enums.AlertStatus = {
  UNREAD: 'UNREAD',
  READ: 'READ'
};

exports.AlertTriageStatus = exports.$Enums.AlertTriageStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  ARCHIVED: 'ARCHIVED'
};

exports.Prisma.ModelName = {
  User: 'User',
  Account: 'Account',
  Session: 'Session',
  VerificationToken: 'VerificationToken',
  Supplier: 'Supplier',
  Address: 'Address',
  Pool: 'Pool',
  PoolItem: 'PoolItem',
  PoolItemStatusHistory: 'PoolItemStatusHistory',
  Payment: 'Payment',
  Shipment: 'Shipment',
  Product: 'Product',
  Conversation: 'Conversation',
  Message: 'Message',
  ConversationParticipant: 'ConversationParticipant',
  ExternalListingCache: 'ExternalListingCache',
  ListingSearch: 'ListingSearch',
  ListingSearchItem: 'ListingSearchItem',
  SavedListing: 'SavedListing',
  ExportCategory: 'ExportCategory',
  Alert: 'Alert',
  PushToken: 'PushToken',
  ProductView: 'ProductView',
  Wishlist: 'Wishlist',
  SourcingRequest: 'SourcingRequest',
  Review: 'Review',
  ReviewHelpfulVote: 'ReviewHelpfulVote'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
