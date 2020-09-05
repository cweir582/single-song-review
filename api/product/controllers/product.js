'use strict';

const crypto = require('crypto');
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const stripe = require("stripe")(process.env.STRIPE_SK);

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {

  async findOne(ctx) {
    const { slug } = ctx.params;

    try {
      const entity = await strapi.services.product.findOne({ slug });
    return sanitizeEntity(entity, { model: strapi.models.product });
    } catch (error) {

      console.log(error);
      console.log("Oh no!");
    }
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

    return { id: session.id };
  }

};
