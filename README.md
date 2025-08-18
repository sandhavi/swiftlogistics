# SwiftLogistics - Middleware Architecture

## Introduction

SwiftLogistics is a modern middleware solution designed to integrate heterogeneous logistics systems for Swift Logistics (Pvt) Ltd. The platform provides seamless integration between legacy and modern systems while offering real-time tracking and delivery management capabilities.

## Architecture Overview

### System Components

The SwiftLogistics middleware architecture consists of the following key components:

1. **Client Management System (CMS)** - Legacy SOAP/XML API system
2. **Route Optimization System (ROS)** - Cloud-based REST/JSON API service
3. **Warehouse Management System (WMS)** - TCP/IP messaging system
4. **SwiftTrack Platform** - Modern web-based middleware and UI

### Architectural Patterns

#### 1. Event-Driven Architecture
- **Pattern**: Publish-Subscribe with Server-Sent Events (SSE)
- **Implementation**: Real-time event streaming for order updates, package status changes, and route assignments
- **Benefits**: Decoupled components, real-time updates, scalable communication

#### 2. Message Broker Pattern
- **Pattern**: Event Bus with Outbox Pattern
- **Implementation**: In-memory event bus with persistent outbox for reliability
- **Benefits**: Reliable message delivery, fault tolerance, system decoupling

#### 3. API Gateway Pattern
- **Pattern**: Protocol Translation and Aggregation
- **Implementation**: Next.js API routes handling SOAP, REST, and TCP/IP protocols
- **Benefits**: Single entry point, protocol abstraction, security centralization

#### 4. Saga Pattern
- **Pattern**: Distributed Transaction Management
- **Implementation**: Order processing with compensation logic for system failures
- **Benefits**: Data consistency, fault tolerance, system resilience

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **Real-time**: Server-Sent Events (SSE)

### Backend
- **Runtime**: Node.js with Next.js API routes
- **Validation**: Zod schema validation
- **Event System**: Custom in-memory event bus
- **Storage**: In-memory store with outbox pattern

### Integration
- **SOAP**: XML-based communication with CMS
- **REST**: JSON-based communication with ROS
- **TCP/IP**: Custom messaging protocol with WMS
- **Security**: API key authentication

## System Architecture

### Conceptual Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Portal │    │   Driver App    │    │   Admin Panel   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     SwiftTrack API        │
                    │   (Next.js Middleware)    │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐    ┌───────────▼──────────┐    ┌────────▼────────┐
│   CMS System   │    │   ROS System         │    │   WMS System    │
│  (SOAP/XML)    │    │  (REST/JSON)         │    │  (TCP/IP)       │
└────────────────┘    └──────────────────────┘    └─────────────────┘
```

### Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SwiftTrack Platform                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Client UI   │  │ Driver UI   │  │ Real-time   │            │
│  │ (React)     │  │ (React)     │  │ Updates     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                    API Gateway Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Order API   │  │ Driver API  │  │ System APIs │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Order Mgmt  │  │ Route Mgmt  │  │ Event Bus   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                    Integration Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ CMS Adapter │  │ ROS Adapter │  │ WMS Adapter │            │
│  │ (SOAP)      │  │ (REST)      │  │ (TCP/IP)    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Real-time Event Streaming
- Server-Sent Events (SSE) for instant updates
- Event-driven architecture for system decoupling
- Real-time order status updates
- Live delivery tracking

### 2. Multi-Protocol Integration
- **SOAP/XML**: Legacy CMS system integration
- **REST/JSON**: Modern ROS system integration
- **TCP/IP**: WMS system messaging
- Protocol translation and data format conversion

### 3. Reliability & Fault Tolerance
- Idempotency support for duplicate request handling
- Outbox pattern for reliable message delivery
- Saga pattern for distributed transaction management
- Graceful degradation during system failures

### 4. Security
- API key authentication
- Request validation with Zod schemas
- Security headers (X-Frame-Options, X-Content-Type-Options)
- Input sanitization and validation

### 5. Scalability
- Event-driven architecture for horizontal scaling
- Stateless API design
- Efficient real-time communication
- Modular component design

## API Endpoints

### Order Management
- `POST /api/orders` - Create new order
- `GET /api/orders` - List all orders

### Driver Operations
- `POST /api/driver/deliver` - Mark package as delivered
- `POST /api/driver/fail` - Mark package as failed

### System Integration
- `POST /api/cms` - CMS system integration
- `POST /api/ros` - ROS system integration
- `POST /api/wms` - WMS system integration

### Real-time Updates
- `GET /api/updates` - Server-Sent Events stream

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd swiftlogistics

# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
pnpm dev
```

### Environment Variables
```env
# API Configuration
SWIFT_API_KEY=your-api-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# System Integration URLs (for production)
CMS_API_URL=https://cms.swiftlogistics.com
ROS_API_URL=https://ros.swiftlogistics.com
WMS_API_URL=tcp://wms.swiftlogistics.com:8080
```

## Usage

### Client Portal
1. Navigate to `/client`
2. View order statistics and real-time updates
3. Create new orders with multiple packages
4. Track delivery status in real-time

### Driver App
1. Navigate to `/driver`
2. View assigned routes and delivery manifest
3. Update package delivery status
4. Track route waypoints and delivery history

### API Integration
```bash
# Create a new order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d '{
    "clientId": "client123",
    "driverId": "driverA",
    "packages": [
      {
        "description": "Laptop",
        "address": "123 Main St"
      }
    ]
  }'

# Subscribe to real-time updates
curl -N http://localhost:3000/api/updates
```

## Development

### Project Structure
```
swiftlogistics/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── client/        # Client portal
│   │   ├── driver/        # Driver app
│   │   ├── components/    # React components
│   │   └── lib/          # Business logic
│   └── middleware.ts     # API middleware
├── public/               # Static assets
└── package.json
```

### Key Components

#### Event Bus (`src/app/lib/bus.ts`)
- In-memory event publishing and subscription
- Real-time event distribution
- Error handling and recovery

#### Store (`src/app/lib/store.ts`)
- In-memory data storage
- Outbox pattern implementation
- Order and route management

#### Validation (`src/app/lib/validation.ts`)
- Zod schema validation
- Idempotency checking
- Input sanitization

## Security Considerations

### Authentication & Authorization
- API key-based authentication for system-to-system communication
- Environment variable configuration for sensitive data
- Secure headers implementation

### Data Protection
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS protection through proper encoding

### Communication Security
- HTTPS enforcement in production
- Secure WebSocket connections for real-time updates
- API rate limiting (to be implemented)

## Performance & Scalability

### Current Implementation
- In-memory storage for prototype
- Server-Sent Events for real-time updates
- Efficient React rendering with proper state management

### Production Considerations
- Database integration (PostgreSQL/MongoDB)
- Message queue system (RabbitMQ/Apache Kafka)
- Load balancing and horizontal scaling
- Caching layer (Redis)
- CDN for static assets

## Testing

### Manual Testing
1. Create orders through client portal
2. Verify real-time updates across systems
3. Test driver delivery operations
4. Validate system integration responses

### Automated Testing (To be implemented)
- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for user workflows
- Performance and load testing

## Deployment

### Development
```bash
pnpm dev
```

### Production Build
```bash
pnpm build
pnpm start
```

### Docker Deployment (To be implemented)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Monitoring & Observability

### Logging
- Structured logging for API requests
- Error tracking and reporting
- Performance metrics collection

### Health Checks
- System status monitoring
- Integration endpoint health checks
- Real-time system metrics

## Future Enhancements

### Planned Features
1. **Database Integration**: PostgreSQL for persistent storage
2. **Message Queue**: RabbitMQ for reliable message processing
3. **Authentication**: JWT-based user authentication
4. **Mobile App**: React Native driver application
5. **Analytics**: Delivery performance analytics
6. **Notifications**: Push notifications for drivers and clients

### Scalability Improvements
1. **Microservices**: Service decomposition
2. **Container Orchestration**: Kubernetes deployment
3. **Caching**: Redis for performance optimization
4. **CDN**: Global content delivery
5. **Monitoring**: Prometheus and Grafana integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.
