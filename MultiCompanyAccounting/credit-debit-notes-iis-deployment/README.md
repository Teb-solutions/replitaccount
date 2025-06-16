# Credit/Debit Notes System - IIS Deployment Package

## Overview
This package contains the complete credit and debit notes system specifically configured for Windows IIS deployment.

## Package Contents
- **Server APIs**: Credit/debit notes functionality with Application Insights
- **UI Components**: React TypeScript components for management interfaces
- **IIS Configuration**: web.config and deployment scripts
- **Documentation**: Complete setup and integration guides
- **Tests**: Comprehensive test suite

## Quick Start
1. Extract to IIS directory
2. Run `install.bat` or `npm install`
3. Configure database connection
4. Set up IIS site with provided web.config
5. Initialize database: POST /api/setup-database
6. Access UI at configured domain

## Features
- Credit notes management with product line items
- Debit notes management for vendor adjustments
- Intercompany adjustments with dual-note creation
- Application Insights logging integration
- IIS-optimized configuration
- Production-ready error handling

## System Requirements
- Windows Server with IIS 10+
- Node.js 18+
- iisnode module
- PostgreSQL database access

See documentation/ folder for detailed setup instructions.
