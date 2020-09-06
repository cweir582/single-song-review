"use strict";
const crypto = require("crypto");
const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const stripe = require("stripe")(process.env.STRIPE_SK);
/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    let body, entity, session;

    if (ctx.is("multipart")) {
    } else {
      // console.log(ctx.request.body);

      const { body } = ctx.request;
      const confToken = crypto.randomBytes(64).toString("hex");

      let products = Object.keys(body.cart).map((item, idx) => {
        const product = JSON.parse(item);
        return {
          title: product.title,
          product: product,
          quantity: body.cart[item],
          total: product.price * body.cart[item],
        };
      });

      const order = body;

      body.cart = products;
      body.confirm = confToken;

      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: products.map((item) => {
          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.product.title,
              },
              unit_amount: item.product.price * 100,
            },
            quantity: item.quantity,
          };
        }),
        mode: "payment",
        success_url:
          process.env.FRONTEND_URL + "/checkout/confirmed?confirm=" + confToken,
        cancel_url: process.env.FRONTEND_URL + "/checkout/",
      });

      try {
        entity = await strapi.services.order.create(order);
      } catch (error) {
        console.log(error);
      }
    }

    return { id: session.id };
  },

  async confirmOrder(ctx) {
    const { token } = ctx.params;

    const order = await strapi.query("order").findOne({ confirm: token });

    if (!order) throw new Error("Order not found");

    await strapi.plugins["email"].services.email.send({
      to: process.env.SEND_ORDER_NOTIFICATON,
      from: "hi@asinglesongreview.com",
      replyTo: "hi@asinglesongreview.com",
      subject: "Order confirmed ",
      text: "There's a new order. ID: " + order.id,
    });

    let cartHtml = "";

    order.cart.forEach((item) => {
      cartHtml += `<div>${item.title} - ${item.quantity} x $${item.product.price} = $${item.total}</div>`;
    });

    const updatedOrder = await strapi.query("order").update(
      { id: order.id },
      {
        confirm: null,
        order_state: "paid",
      }
    );

    await strapi.plugins["email"].services.email.send({
      to: order.email,
      from: "hi@asinglesongreview.com",
      replyTo: "hi@asinglesongreview.com",
      subject: "Order confirmed",
      html: `Thanks for your order.\n
      Your order id is ${order.id}\n
          ${cartHtml}`,
    });

    return sanitizeEntity(updatedOrder, { model: strapi.models.product });
  },
};
