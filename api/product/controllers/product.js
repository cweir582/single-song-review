'use strict';
const stripe = require("stripe")(process.env.STRIPE_SK);

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async createPaymentIntent(ctx) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 150,
      currency: "usd"
    });

    return { message: paymentIntent.client_secret}
  }

};
