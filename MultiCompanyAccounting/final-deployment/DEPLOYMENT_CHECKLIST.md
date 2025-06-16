# IIS Deployment Checklist

## Pre-Deployment
- [ ] Windows Server 2016+ with IIS 10+
- [ ] Node.js 18+ installed
- [ ] iisnode module installed
- [ ] PostgreSQL database accessible
- [ ] Administrator privileges available

## Installation Steps
- [ ] Extract package to server
- [ ] Run `install.ps1` as Administrator OR follow manual steps
- [ ] Verify IIS site creation
- [ ] Test health endpoint: `/api/health`
- [ ] Initialize database: POST `/api/setup-database`
- [ ] Verify company data: `/api/companies`
- [ ] Test credit notes: `/api/credit-notes`
- [ ] Test debit notes: `/api/debit-notes`

## Post-Deployment
- [ ] Configure HTTPS certificates
- [ ] Set up monitoring
- [ ] Configure backup procedures
- [ ] Test all UI components
- [ ] Verify Application Insights logging
- [ ] Load test with production data

## Troubleshooting
- Check Node.js installation: `node --version`
- Verify iisnode: Check IIS modules
- Database connectivity: Test port 5432 to 135.235.154.222
- Permissions: Ensure IIS_IUSRS has access
- Logs: Check `logs/` directory and IIS logs

## Support
- Health check: `/api/health`
- API documentation: Available in `documentation/` folder
- Test suite: `node test-all-apis.js`
