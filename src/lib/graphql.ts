import { gql } from "graphql-tag";

// ============================================================================
// Authentication
// ============================================================================

export const TOKEN_CREATE = gql`
  mutation TokenCreate($email: String!, $password: String!) {
    tokenCreate(email: $email, password: $password) {
      token
      refreshToken
      user {
        id
        email
        firstName
        lastName
        isStaff
      }
      errors {
        field
        message
      }
    }
  }
`;

export const TOKEN_REFRESH = gql`
  mutation TokenRefresh($refreshToken: String!) {
    tokenRefresh(refreshToken: $refreshToken) {
      token
      errors {
        field
        message
      }
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      isStaff
    }
  }
`;

// ============================================================================
// Dashboard Stats
// ============================================================================

export const DASHBOARD_STATS = gql`
  query DashboardStats {
    orders(first: 100) {
      totalCount
    }
    products(first: 1) {
      totalCount
    }
  }
`;

export const ORDERS_TODAY = gql`
  query OrdersToday($dateFrom: DateTime!) {
    orders(first: 100, filter: { created: { gte: $dateFrom } }) {
      totalCount
      edges {
        node {
          id
          number
          total {
            gross {
              amount
              currency
            }
          }
        }
      }
    }
  }
`;

// ============================================================================
// Orders
// ============================================================================

export const ORDERS_LIST = gql`
  query OrdersList($first: Int!, $after: String, $filter: OrderFilterInput) {
    orders(first: $first, after: $after, filter: $filter) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          number
          created
          status
          paymentStatus
          total {
            gross {
              amount
              currency
            }
          }
          user {
            id
            email
            firstName
            lastName
          }
          shippingAddress {
            firstName
            lastName
            phone
            streetAddress1
            city
          }
        }
      }
    }
  }
`;

export const ORDER_DETAILS = gql`
  query OrderDetails($id: ID!) {
    order(id: $id) {
      id
      number
      created
      status
      paymentStatus
      total {
        gross {
          amount
          currency
        }
      }
      subtotal {
        gross {
          amount
        }
      }
      shippingPrice {
        gross {
          amount
        }
      }
      user {
        id
        email
        firstName
        lastName
      }
      shippingAddress {
        firstName
        lastName
        phone
        streetAddress1
        streetAddress2
        city
        postalCode
      }
      billingAddress {
        firstName
        lastName
        phone
        streetAddress1
        city
      }
      lines {
        id
        productName
        variantName
        quantity
        unitPrice {
          gross {
            amount
          }
        }
        totalPrice {
          gross {
            amount
          }
        }
        thumbnail {
          url
        }
      }
      fulfillments {
        id
        status
        created
        lines {
          id
          quantity
          orderLine {
            productName
          }
        }
      }
      events {
        id
        type
        date
        message
        user {
          email
        }
      }
    }
  }
`;

export const ORDER_FULFILL = gql`
  mutation OrderFulfill($order: ID!, $input: OrderFulfillInput!) {
    orderFulfill(order: $order, input: $input) {
      fulfillments {
        id
        status
      }
      order {
        id
        status
      }
      errors {
        field
        message
      }
    }
  }
`;

// ============================================================================
// Products - With Stock Information
// ============================================================================

// Products list without filter (to avoid undefined search issue)
export const PRODUCTS_LIST = gql`
  query ProductsList($first: Int!, $after: String, $channel: String!) {
    products(first: $first, after: $after, channel: $channel) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          slug
          thumbnail {
            url
          }
          category {
            id
            name
          }
          productType {
            id
            name
          }
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
          }
          channelListings {
            channel {
              slug
            }
            isPublished
            isAvailableForPurchase
          }
          variants {
            id
            name
            sku
            quantityAvailable
            stocks {
              id
              quantity
              quantityAllocated
              warehouse {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

// Products with search filter
export const PRODUCTS_SEARCH = gql`
  query ProductsSearch($first: Int!, $search: String!, $channel: String!) {
    products(first: $first, filter: { search: $search }, channel: $channel) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          slug
          thumbnail {
            url
          }
          category {
            id
            name
          }
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
          }
          channelListings {
            channel {
              slug
            }
            isPublished
          }
          variants {
            id
            name
            sku
            quantityAvailable
            stocks {
              id
              quantity
              warehouse {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

export const PRODUCT_DETAILS = gql`
  query ProductDetails($id: ID!, $channel: String!) {
    product(id: $id, channel: $channel) {
      id
      name
      slug
      description
      seoTitle
      seoDescription
      category {
        id
        name
      }
      productType {
        id
        name
        hasVariants
      }
      thumbnail {
        url
      }
      media {
        id
        url
        alt
      }
      variants {
        id
        name
        sku
        quantityAvailable
        pricing {
          price {
            gross {
              amount
              currency
            }
          }
        }
        stocks {
          id
          quantity
          quantityAllocated
          warehouse {
            id
            name
            slug
          }
        }
      }
      channelListings {
        channel {
          id
          slug
          name
        }
        isPublished
        isAvailableForPurchase
        pricing {
          priceRange {
            start {
              gross {
                amount
              }
            }
          }
        }
      }
    }
  }
`;

export const PRODUCT_CREATE = gql`
  mutation ProductCreate($input: ProductCreateInput!) {
    productCreate(input: $input) {
      product {
        id
        name
        slug
      }
      errors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_UPDATE = gql`
  mutation ProductUpdate($id: ID!, $input: ProductInput!) {
    productUpdate(id: $id, input: $input) {
      product {
        id
        name
      }
      errors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_DELETE = gql`
  mutation ProductDelete($id: ID!) {
    productDelete(id: $id) {
      product {
        id
      }
      errors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_CHANNEL_LISTING_UPDATE = gql`
  mutation ProductChannelListingUpdate($id: ID!, $input: ProductChannelListingUpdateInput!) {
    productChannelListingUpdate(id: $id, input: $input) {
      product {
        id
        channelListings {
          isPublished
          isAvailableForPurchase
          channel {
            id
            slug
          }
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_VARIANT_CREATE = gql`
  mutation ProductVariantCreate($input: ProductVariantCreateInput!) {
    productVariantCreate(input: $input) {
      productVariant {
        id
        name
        sku
      }
      errors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_VARIANT_CHANNEL_LISTING_UPDATE = gql`
  mutation ProductVariantChannelListingUpdate($id: ID!, $input: [ProductVariantChannelListingAddInput!]!) {
    productVariantChannelListingUpdate(id: $id, input: $input) {
      variant {
        id
        channelListings {
          channel {
            slug
          }
          price {
            amount
            currency
          }
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_MEDIA_CREATE = gql`
  mutation ProductMediaCreate($product: ID!, $image: Upload!, $alt: String) {
    productMediaCreate(input: { product: $product, image: $image, alt: $alt }) {
      product {
        id
        media {
          id
          url
          alt
        }
        thumbnail {
          url
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const PRODUCT_MEDIA_DELETE = gql`
  mutation ProductMediaDelete($id: ID!) {
    productMediaDelete(id: $id) {
      product {
        id
        media {
          id
          url
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

// ============================================================================
// Stock Management
// ============================================================================

export const STOCK_LIST = gql`
  query StockList($first: Int!, $after: String) {
    productVariants(first: $first, after: $after) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          sku
          quantityAvailable
          product {
            id
            name
            thumbnail {
              url
            }
          }
          stocks {
            id
            quantity
            quantityAllocated
            warehouse {
              id
              name
              slug
            }
          }
        }
      }
    }
  }
`;

export const STOCK_UPDATE = gql`
  mutation StockUpdate($variantId: ID!, $warehouseId: ID!, $quantity: Int!) {
    productVariantStocksUpdate(
      variantId: $variantId
      stocks: [{ warehouse: $warehouseId, quantity: $quantity }]
    ) {
      productVariant {
        id
        stocks {
          id
          quantity
          quantityAllocated
          warehouse {
            id
            name
          }
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const STOCK_CREATE = gql`
  mutation StockCreate($variantId: ID!, $warehouseId: ID!, $quantity: Int!) {
    productVariantStocksCreate(
      variantId: $variantId
      stocks: [{ warehouse: $warehouseId, quantity: $quantity }]
    ) {
      productVariant {
        id
        stocks {
          id
          quantity
          warehouse {
            id
            name
          }
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const WAREHOUSES_LIST = gql`
  query WarehousesList {
    warehouses(first: 50) {
      edges {
        node {
          id
          name
          slug
          address {
            streetAddress1
            city
            country {
              country
            }
          }
          shippingZones(first: 10) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

// ============================================================================
// Delivery / Drivers
// ============================================================================

export const DRIVERS_LIST = gql`
  query DriversList($first: Int) {
    allDrivers(first: $first) {
      totalCount
      edges {
        node {
          id
          isActive
          isOnline
          vehicleType
          vehicleNumber
          activeDeliveriesCount
          user {
            id
            firstName
            lastName
            email
          }
        }
      }
    }
  }
`;

export const CREATE_DRIVER = gql`
  mutation CreateDriver($input: CreateDriverInput!) {
    createDriver(input: $input) {
      driver {
        id
        isActive
        vehicleType
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_DRIVER = gql`
  mutation UpdateDriver($id: ID!, $input: UpdateDriverInput!) {
    updateDriver(id: $id, input: $input) {
      driver {
        id
        vehicleType
        vehicleNumber
      }
      errors {
        field
        message
      }
    }
  }
`;

export const DELETE_DRIVER = gql`
  mutation DeleteDriver($id: ID!) {
    deleteDriver(id: $id) {
      success
      errors {
        field
        message
      }
    }
  }
`;

export const ORDERS_READY_FOR_DELIVERY = gql`
  query OrdersReadyForDelivery($first: Int) {
    ordersReadyForDelivery(first: $first) {
      totalCount
      edges {
        node {
          id
          orderId
          orderNumber
          status
          customerName
          customerPhone
          shippingAddress
          orderTotal
          itemsCount
          createdAt
          assignedDriver {
            id
            firstName
            lastName
          }
        }
      }
    }
  }
`;

export const ASSIGN_DRIVER = gql`
  mutation AssignDeliveryDriver($orderId: ID!, $driverId: ID!, $notes: String) {
    assignDeliveryDriver(orderId: $orderId, driverId: $driverId, notes: $notes) {
      tracking {
        id
        status
        assignedDriver {
          id
          firstName
          lastName
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

// ============================================================================
// Categories (for product creation)
// ============================================================================

export const CATEGORIES_LIST = gql`
  query CategoriesList {
    categories(first: 100) {
      edges {
        node {
          id
          name
          slug
          level
          parent {
            id
            name
          }
        }
      }
    }
  }
`;

// ============================================================================
// Product Types (for product creation)
// ============================================================================

export const PRODUCT_TYPES_LIST = gql`
  query ProductTypesList {
    productTypes(first: 100) {
      edges {
        node {
          id
          name
          hasVariants
        }
      }
    }
  }
`;

// ============================================================================
// Staff Users (for driver creation)
// ============================================================================

export const STAFF_USERS = gql`
  query StaffUsers($first: Int) {
    staffUsers(first: $first) {
      edges {
        node {
          id
          email
          firstName
          lastName
        }
      }
    }
  }
`;

// ============================================================================
// Channels
// ============================================================================

export const CHANNELS_LIST = gql`
  query ChannelsList {
    channels {
      id
      name
      slug
      isActive
      currencyCode
    }
  }
`;
