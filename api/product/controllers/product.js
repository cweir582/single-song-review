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

    try {
      const subs = await strapi.query("subscriber").findOne({ hr_token: token });

    if(!subs) throw new Error("Token don't match");

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

    console.log(session.id);

    const subscriber = await strapi.query("subscriber").update(
      { id: subs.id  },
      {
        hr_confirm: confToken,
        hr_sessionid: session.id
      }
    );

    return { id: session.id };
    } catch (error) {
      console.log("Oh no!");
    }
  },

  async unsubscribeToHR(ctx) {
    const { token } = JSON.parse(ctx.request.body);
    console.log(token)
    try {
      const subs = await strapi.query("subscriber").findOne({ hr_confirm: token });

      if(!subs) throw new Error('Can\'t find user');
      const session = await stripe.checkout.sessions.retrieve(subs.hr_sessionid);
      await stripe.subscriptions.update(session.subscription, {cancel_at_period_end: true});

      const subscriber = await strapi.query("subscriber").update(
        { id: subs.id  },
        {
          hr_confirm: null,
          hellreview: false
        }
      );

      return { message: "Subscription cancelled" }
    } catch (error) {
      console.log(error);
      console.log("Oh no!");
    }
  }

};
