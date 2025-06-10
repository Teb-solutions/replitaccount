// Simple Swagger setup for API documentation

export const setupSwagger = (app) => {
  // Import existing swagger router
  import('./swagger.js').then(swaggerModule => {
    app.use(swaggerModule.default);
    console.log('Swagger documentation available at /api-docs');
  }).catch(error => {
    console.error('Error setting up Swagger:', error);
  });
};