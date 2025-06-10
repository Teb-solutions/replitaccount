# IIS External Access Configuration Guide

## Current Issue
Your multi-company accounting system works locally but cannot be accessed externally through IIS public URL.

## Solution Steps

### 1. IIS Configuration
Ensure these settings in IIS Manager:

**Site Bindings:**
- Type: HTTP or HTTPS
- Port: 80 (HTTP) or 443 (HTTPS)
- IP Address: All Unassigned (*)
- Host name: Your domain (optional)

**Application Pool Settings:**
- .NET CLR Version: No Managed Code
- Managed Pipeline Mode: Integrated
- Process Model Identity: ApplicationPoolIdentity or IIS_IUSRS

### 2. Web.config Updates
Update your web.config file with these settings:

```xml
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="clean-server.js" verb="*" modules="iisnode" />
    </handlers>
    
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^clean-server.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="clean-server.js"/>
        </rule>
      </rules>
    </rewrite>
    
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="1073741824" />
      </requestFiltering>
    </security>
    
    <iisnode 
      node_env="production"
      nodeProcessCountPerApplication="1"
      maxConcurrentRequestsPerProcess="1024"
      maxNamedPipeConnectionRetry="3"
      namedPipeConnectionRetryDelay="2000"
      maxNamedPipeConnectionPoolSize="512"
      maxNamedPipePooledConnectionAge="30000"
      asyncCompletionThreadCount="0"
      initialRequestBufferSize="4096"
      maxRequestBufferSize="65536"
      watchedFiles="*.js"
      uncFileChangesPollingInterval="5000"
      gracefulShutdownTimeout="60000"
      loggingEnabled="true"
      logDirectoryNameSuffix="logs"
      debuggingEnabled="false"
      debuggerPortRange="5058-6058"
      debuggerPathSegment="debug"
      maxLogFileSizeInKB="128"
      appendToExistingLog="false"
      logFileFlushInterval="5000"
      devErrorsEnabled="false"
      flushResponse="false"
      enableXFF="false"
      promoteServerVars="" />
      
    <httpErrors>
      <remove statusCode="404" subStatusCode="-1" />
      <error statusCode="404" prefixLanguageFilePath="" path="/index.html" responseMode="ExecuteURL" />
    </httpErrors>
  </system.webServer>
</configuration>
```

### 3. Windows Firewall Configuration

**Allow inbound connections:**
```cmd
netsh advfirewall firewall add rule name="Node.js App" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="Node.js App HTTPS" dir=in action=allow protocol=TCP localport=443
```

**Or through Windows Firewall GUI:**
1. Open Windows Firewall with Advanced Security
2. Click "Inbound Rules" → "New Rule"
3. Select "Port" → "TCP" → Specific ports: 80, 443
4. Allow the connection
5. Apply to all profiles

### 4. Server Code Updates for IIS

Update your server file to handle IIS environment:

```javascript
// Add at the top of clean-server.js
const PORT = process.env.PORT || process.env.IISNODE_HTTP_PORT || 3002;

// Change server binding
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 5. Network Router Configuration

**Port Forwarding (if behind router):**
- Forward port 80 (HTTP) to your server's internal IP
- Forward port 443 (HTTPS) if using SSL
- Example: External port 80 → Internal IP:80

### 6. DNS Configuration

**Domain Setup:**
- Point your domain A record to your server's public IP
- Or use CNAME if pointing to another domain
- Allow DNS propagation time (up to 24 hours)

### 7. Testing External Access

**From external network:**
```bash
# Test basic connectivity
ping your-domain.com

# Test HTTP access
curl http://your-domain.com/api/companies

# Test specific endpoints
curl http://your-domain.com/health
curl http://your-domain.com/api-docs
```

### 8. Common Issues and Solutions

**Issue: 502 Bad Gateway**
- Check if Node.js application is running
- Verify iisnode module is installed
- Check application pool is started

**Issue: 404 Not Found**
- Verify web.config rewrite rules
- Check file permissions on application folder
- Ensure clean-server.js is in root directory

**Issue: Connection Timeout**
- Check Windows Firewall settings
- Verify router port forwarding
- Check if ISP blocks port 80/443

**Issue: Can't reach server**
- Verify public IP address
- Check DNS resolution
- Test from different external networks

### 9. Security Considerations

**Production Security:**
- Enable HTTPS with SSL certificate
- Configure proper authentication
- Set up rate limiting
- Review CORS settings for production domains

**SSL Certificate Setup:**
1. Obtain SSL certificate (Let's Encrypt, commercial CA)
2. Install certificate in IIS
3. Update site bindings to use HTTPS
4. Redirect HTTP to HTTPS

### 10. Monitoring and Logs

**Check IIS logs:**
- Location: `C:\inetpub\logs\LogFiles\W3SVC1\`
- Review for error patterns and access attempts

**Node.js application logs:**
- Check iisnode logs in your application directory
- Monitor for database connection issues
- Review API response times

This configuration should resolve your external access issues and make your multi-company accounting system available through your public IIS URL.