'use strict';
const subscriber = require("../../subscriber/controllers/subscriber");
const crypto = require('crypto');
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
  },
  async subscribeToHR(ctx) {
    const { token } = JSON.parse(ctx.request.body);
    const confToken = crypto.randomBytes(64).toString('hex');

    const subs = await strapi.query("subscriber").findOne({ hr_token: token });

    const subscriber = await strapi.query("subscriber").update(
      { id: subs.id  },
      {
        hr_confirm: confToken
      }
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.HR_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: process.env.FRONTEND_URL + "/hell-review/confirmed?confirm="+confToken,
      cancel_url: process.env.FRONTEND_URL + "/hell-review/",
    });

    console.log("Here");

    return { id: session.id };
  }

};
