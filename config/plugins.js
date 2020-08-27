module.exports = ({ env }) => ({
  // ...
  email: {
    provider: 'sendgrid',
    providerOptions: {
      apiKey: env('SENDGRID_API_KEY'),
    },
    settings: {
      defaultFrom: 'juliasedefdjian@strapi.io',
      defaultReplyTo: 'juliasedefdjian@strapi.io',
    },
  },
  // ...
});
